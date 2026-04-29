import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Types for slot data
interface TimeSlot {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'ideal' | 'alternative';
  availableDuration: number;
  // Enhanced info
  nextLecturerClass?: {
    lecturerName: string;
    className: string;
    classStart: string;
    minutesUntilClass: number;
  };
}

interface LecturerBusySlot {
  startTime: number; // minutes from midnight
  endTime: number; // minutes from midnight
  lecturerId?: string;
  lecturerName?: string;
  activity?: string;
  isBreak?: boolean;
}

// Working hours configuration
const WORK_START = 8 * 60; // 08:00 in minutes
const WORK_END = 17 * 60 + 40; // 17:40 in minutes
const TRANSITION_GAP = 5; // 5 minutes transition buffer
const MAX_RECOMMENDATIONS = 30; // Maximum slots to return

// Duration requirements by seminar type (in minutes)
const DURATION_REQUIREMENTS: Record<string, number> = {
  Proposal: 90,
  Hasil: 90,
  Sidang: 120,
};

// Global break times
const GLOBAL_BREAKS = [
  { start: '12:00', end: '13:30', name: 'Istirahat Siang' },
  { start: '15:40', end: '16:00', name: 'Istirahat Ashar' },
];

// Days of the week (Indonesian)
const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

// Convert time string (HH:mm) to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes from midnight to time string (HH:mm)
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Parse day name to Indonesian format
function parseDayName(dayName: string): string {
  const dayMap: Record<string, string> = {
    Monday: 'Senin',
    Tuesday: 'Selasa',
    Wednesday: 'Rabu',
    Thursday: 'Kamis',
    Friday: 'Jumat',
    Saturday: 'Sabtu',
    Sunday: 'Minggu',
    Senin: 'Senin',
    Selasa: 'Selasa',
    Rabu: 'Rabu',
    Kamis: 'Kamis',
    Jumat: 'Jumat',
    Sabtu: 'Sabtu',
    Minggu: 'Minggu',
  };
  return dayMap[dayName] || dayName;
}

// Get lecturer busy slots for a specific day (including transition gap and details)
async function getLecturerBusySlotsForDay(
  ctx: any,
  lecturerId: string,
  day: string
): Promise<LecturerBusySlot[]> {
  const schedules = await ctx.db
    .query('teaching_schedules')
    .withIndex('by_lecturer', (q: any) => q.eq('lecturerId', lecturerId))
    .collect();

  const lecturer = await ctx.db.get(lecturerId);
  const lecturerName = lecturer?.name || 'Dosen';

  const daySchedules = schedules.filter((s: any) => parseDayName(s.day) === parseDayName(day));

  return daySchedules.map((s: any) => ({
    startTime: timeToMinutes(s.startTime) - TRANSITION_GAP, // Add buffer before
    endTime: timeToMinutes(s.endTime) + TRANSITION_GAP, // Add buffer after
    lecturerId,
    lecturerName,
    activity: s.activity,
  }));
}

// Get already scheduled seminars for a specific date to avoid double booking
async function getScheduledSeminarsForDate(
  ctx: any,
  date: string,
  lecturerIds: string[]
): Promise<LecturerBusySlot[]> {
  const scheduledSeminars = await ctx.db
    .query('seminar_requests')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('status'), 'scheduled'),
        q.eq(q.field('scheduledDate'), date)
      )
    )
    .collect();

  const relevantSeminars = scheduledSeminars.filter((s: any) => {
    return lecturerIds.includes(s.supervisor1Id) ||
           (s.supervisor2Id && lecturerIds.includes(s.supervisor2Id)) ||
           (s.examiner1Id && lecturerIds.includes(s.examiner1Id)) ||
           (s.examiner2Id && lecturerIds.includes(s.examiner2Id));
  });

  return relevantSeminars.map((s: any) => ({
    startTime: timeToMinutes(s.scheduledStartTime || s.scheduledTime || '08:00'),
    endTime: timeToMinutes(s.scheduledEndTime || '10:00'),
    activity: `Seminar ${s.studentName}`,
  }));
}

// Find free time windows in a day given busy slots
function findFreeWindows(
  busySlots: LecturerBusySlot[],
  workStart: number,
  workEnd: number
): Array<{ start: number; end: number }> {
  // Sort busy slots by start time
  const sorted = [...busySlots].sort((a, b) => a.startTime - b.startTime);

  // Merge overlapping busy slots
  const merged: LecturerBusySlot[] = [];
  for (const slot of sorted) {
    if (merged.length === 0) {
      merged.push({ ...slot });
    } else {
      const last = merged[merged.length - 1];
      if (slot.startTime <= last.endTime) {
        // Overlapping, merge
        last.endTime = Math.max(last.endTime, slot.endTime);
      } else {
        merged.push({ ...slot });
      }
    }
  }

  // Find free windows between merged busy slots
  const freeWindows: Array<{ start: number; end: number }> = [];
  let currentTime = workStart;

  for (const busy of merged) {
    if (busy.startTime > currentTime) {
      // Free window before this busy slot
      freeWindows.push({
        start: currentTime,
        end: Math.min(busy.startTime, workEnd),
      });
    }
    currentTime = Math.max(currentTime, busy.endTime);
  }

  // Check for free time after last busy slot
  if (currentTime < workEnd) {
    freeWindows.push({
      start: currentTime,
      end: workEnd,
    });
  }

  // If no busy slots, entire work day is free
  if (merged.length === 0) {
    freeWindows.push({
      start: workStart,
      end: workEnd,
    });
  }

  return freeWindows;
}

// Find intersection of multiple free windows arrays
function intersectFreeWindows(
  windowsArrays: Array<Array<{ start: number; end: number }>>
): Array<{ start: number; end: number }> {
  if (windowsArrays.length === 0) return [];

  let result = windowsArrays[0];

  for (let i = 1; i < windowsArrays.length; i++) {
    const newResult: Array<{ start: number; end: number }> = [];

    for (const r of result) {
      for (const w of windowsArrays[i]) {
        const start = Math.max(r.start, w.start);
        const end = Math.min(r.end, w.end);

        if (start < end) {
          newResult.push({ start, end });
        }
      }
    }

    result = newResult;
    if (result.length === 0) break;
  }

  return result.sort((a, b) => a.start - b.start);
}

// Generate date strings for a specific week offset from a given date
function generateWeekDates(startDate: Date, weekOffset: number = 0): Array<{ date: string; day: string }> {
  const dates: Array<{ date: string; day: string }> = [];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Start calculating from the provided date
  let currentDate = new Date(startDate);

  // Advance by weekOffset weeks
  currentDate.setDate(currentDate.getDate() + (weekOffset * 7));

  // Generate for 1 week
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateString = currentDate.toISOString().split('T')[0];
      dates.push({
        date: dateString,
        day: dayNames[dayOfWeek],
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Main query: Get available slots for a seminar
export const getAvailableSlots = query({
  args: {
    seminarRequestId: v.id('seminar_requests'),
    weekOffset: v.optional(v.number()), // Which week to view (0 = this week)
    weeksAhead: v.optional(v.number()), // For backwards compatibility with clients that haven't refreshed
  },
  handler: async (ctx, args) => {
    // Get the seminar request
    const seminarRequest = await ctx.db.get(args.seminarRequestId);
    if (!seminarRequest) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    // Get all 4 lecturers involved
    const lecturerIds = [
      seminarRequest.supervisor1Id,
    ];

    if (seminarRequest.supervisor2Id) {
      lecturerIds.push(seminarRequest.supervisor2Id);
    }

    if (seminarRequest.examiner1Id) {
      lecturerIds.push(seminarRequest.examiner1Id);
    }

    if (seminarRequest.examiner2Id) {
      lecturerIds.push(seminarRequest.examiner2Id);
    }

    // Get lecturer names
    const lecturerNames: Record<string, string> = {};
    for (const id of lecturerIds) {
      const lecturer = await ctx.db.get(id);
      if (lecturer) {
        lecturerNames[id] = lecturer.name;
      }
    }

    // Get required duration
    const requiredDuration = DURATION_REQUIREMENTS[seminarRequest.type] || 60;
    const alternativeDuration = requiredDuration - 10; // Secondary search duration

    // Seminars cannot be scheduled on the same day (suddenly). Minimum notice is H+1.
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

    // Generate dates for the targeted week
    const weekOffset = args.weekOffset || 0;
    const weekDates = generateWeekDates(startDate, weekOffset);

    const idealSlots: TimeSlot[] = [];
    const alternativeSlots: TimeSlot[] = [];

    // Check each date
    for (const dateInfo of weekDates) {
      // Get busy slots for all lecturers on this day with details
      const allLecturerBusySlots: LecturerBusySlot[][] = [];

      for (const lecturerId of lecturerIds) {
        const busySlots = await getLecturerBusySlotsForDay(ctx, lecturerId, dateInfo.day);
        allLecturerBusySlots.push(busySlots);
      }

      // Get scheduled seminars for this date to avoid double booking
      const scheduledSeminars = await getScheduledSeminarsForDate(ctx, dateInfo.date, lecturerIds);

      // Add global breaks to scheduled seminars so they act as blocked time
      for (const b of GLOBAL_BREAKS) {
        scheduledSeminars.push({
          startTime: timeToMinutes(b.start),
          endTime: timeToMinutes(b.end),
          activity: b.name,
          isBreak: true,
        });
      }

      // Combine all busy slots for finding free windows
      const allBusySlotsFlat = allLecturerBusySlots.flat().concat(scheduledSeminars);

      // For each lecturer, find their free windows
      const allFreeWindows: Array<Array<{ start: number; end: number }>> = [];

      for (let i = 0; i < lecturerIds.length; i++) {
        const combinedBusy = [...allLecturerBusySlots[i], ...scheduledSeminars];
        const freeWindows = findFreeWindows(combinedBusy, WORK_START, WORK_END);
        allFreeWindows.push(freeWindows);
      }

      // Find common free windows across all lecturers
      const commonFreeWindows = intersectFreeWindows(allFreeWindows);

      // Extract slots from free windows
      for (const window of commonFreeWindows) {
        const windowDuration = window.end - window.start;

        // Find the next class after this free window
        const nextClass = allBusySlotsFlat
          .filter((slot) => slot.startTime >= window.end - TRANSITION_GAP)
          .sort((a, b) => a.startTime - b.startTime)[0];

        const nextLecturerClass = nextClass ? {
          lecturerName: nextClass.lecturerName || 'Dosen',
          className: nextClass.activity || 'Jadwal lain',
          classStart: minutesToTime(nextClass.startTime + (nextClass.isBreak ? 0 : TRANSITION_GAP)),
          minutesUntilClass: nextClass.startTime - window.end,
          isBreak: !!nextClass.isBreak,
        } : undefined;

        // Check for ideal slot
        if (windowDuration >= requiredDuration) {
          let currentStart = window.start;
          // Generate multiple slots within this free window
          while (currentStart + requiredDuration <= window.end) {
            idealSlots.push({
              day: dateInfo.day,
              date: dateInfo.date,
              startTime: minutesToTime(currentStart),
              endTime: minutesToTime(currentStart + requiredDuration),
              type: 'ideal',
              availableDuration: window.end - currentStart, // Remaining duration in this free block
              nextLecturerClass,
            });
            // Step by requiredDuration to create sequential, non-overlapping slots (e.g. 08:00, 09:30, 11:00)
            // You can also use a fixed interval like 30 or 60 if you want overlapping flexible choices
            currentStart += requiredDuration; 
          }
        }
        // Check for alternative slot
        else if (windowDuration >= alternativeDuration) {
          let currentStart = window.start;
          while (currentStart + alternativeDuration <= window.end) {
            alternativeSlots.push({
              day: dateInfo.day,
              date: dateInfo.date,
              startTime: minutesToTime(currentStart),
              endTime: minutesToTime(currentStart + alternativeDuration),
              type: 'alternative',
              availableDuration: window.end - currentStart,
              nextLecturerClass,
            });
            currentStart += alternativeDuration;
          }
        }
      }
    }

    // Sort slots by date and time, then limit to MAX_RECOMMENDATIONS
    const sortByDateAndTime = (a: TimeSlot, b: TimeSlot) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    };

    idealSlots.sort(sortByDateAndTime);
    alternativeSlots.sort(sortByDateAndTime);

    // Deduplicate slots using unique key
    const uniqueMap = (slots: TimeSlot[]) => {
      const map = new Map<string, TimeSlot>();
      slots.forEach(slot => map.set(`${slot.date}-${slot.startTime}`, slot));
      return Array.from(map.values());
    };

    const uniqueIdealSlots = uniqueMap(idealSlots);
    const uniqueAlternativeSlots = uniqueMap(alternativeSlots);

    // Limit to max recommendations
    const limitedIdealSlots = uniqueIdealSlots.slice(0, MAX_RECOMMENDATIONS);
    const remainingSlots = MAX_RECOMMENDATIONS - limitedIdealSlots.length;
    const limitedAlternativeSlots = uniqueAlternativeSlots.slice(0, remainingSlots);

    // Return combined results with ideal slots first
    return {
      seminarRequest: {
        _id: seminarRequest._id,
        studentName: seminarRequest.studentName,
        nim: seminarRequest.nim,
        title: seminarRequest.title,
        type: seminarRequest.type,
        supervisor1Name: lecturerNames[seminarRequest.supervisor1Id],
        supervisor2Name: seminarRequest.supervisor2Id ? lecturerNames[seminarRequest.supervisor2Id] : undefined,
        examiner1Name: seminarRequest.examiner1Id ? lecturerNames[seminarRequest.examiner1Id] : undefined,
        examiner2Name: seminarRequest.examiner2Id ? lecturerNames[seminarRequest.examiner2Id] : undefined,
      },
      requiredDuration,
      alternativeDuration,
      idealSlots: limitedIdealSlots,
      alternativeSlots: limitedAlternativeSlots,
      totalIdealSlots: uniqueIdealSlots.length,
      totalAlternativeSlots: uniqueAlternativeSlots.length,
      showingSlots: limitedIdealSlots.length + limitedAlternativeSlots.length,
    };
  },
});

// Alias for findAvailableSlots (same as getAvailableSlots)
export const findAvailableSlots = getAvailableSlots;

// Get seminar request with all lecturer details for scheduling
export const getSeminarForScheduling = query({
  args: {
    seminarRequestId: v.id('seminar_requests'),
  },
  handler: async (ctx, args) => {
    const seminarRequest = await ctx.db.get(args.seminarRequestId);
    if (!seminarRequest) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    // Get all lecturers
    const supervisor1 = await ctx.db.get(seminarRequest.supervisor1Id);
    const supervisor2 = seminarRequest.supervisor2Id
      ? await ctx.db.get(seminarRequest.supervisor2Id)
      : null;
    const examiner1 = seminarRequest.examiner1Id
      ? await ctx.db.get(seminarRequest.examiner1Id)
      : null;
    const examiner2 = seminarRequest.examiner2Id
      ? await ctx.db.get(seminarRequest.examiner2Id)
      : null;

    return {
      ...seminarRequest,
      supervisor1,
      supervisor2,
      examiner1,
      examiner2,
    };
  },
});

// Schedule a seminar with start and end time
export const scheduleSeminar = mutation({
  args: {
    id: v.id('seminar_requests'),
    scheduledDate: v.string(),
    scheduledStartTime: v.string(),
    scheduledEndTime: v.string(),
    scheduledRoom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    if (existing.status !== 'allocated') {
      throw new Error('Seminar harus sudah dialokasi penguji sebelum dijadwalkan');
    }

    await ctx.db.patch(args.id, {
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledStartTime, // For backward compatibility
      scheduledStartTime: args.scheduledStartTime,
      scheduledEndTime: args.scheduledEndTime,
      scheduledRoom: args.scheduledRoom,
      status: 'scheduled',
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Get schedules by date (for calendar view)
export const getSchedulesByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allScheduled = await ctx.db
      .query('seminar_requests')
      .filter((q) => q.eq(q.field('status'), 'scheduled'))
      .collect();

    // Filter by date range
    const filtered = allScheduled.filter((s) => {
      if (!s.scheduledDate) return false;
      return s.scheduledDate >= args.startDate && s.scheduledDate <= args.endDate;
    });

    // Get lecturer details
    const withLecturers = await Promise.all(
      filtered.map(async (seminar) => {
        const supervisor1 = await ctx.db.get(seminar.supervisor1Id);
        const supervisor2 = seminar.supervisor2Id
          ? await ctx.db.get(seminar.supervisor2Id)
          : null;
        const examiner1 = seminar.examiner1Id
          ? await ctx.db.get(seminar.examiner1Id)
          : null;
        const examiner2 = seminar.examiner2Id
          ? await ctx.db.get(seminar.examiner2Id)
          : null;

        return {
          ...seminar,
          supervisor1,
          supervisor2,
          examiner1,
          examiner2,
        };
      })
    );

    return withLecturers;
  },
});

// Check if a specific slot is still available (for conflict detection)
export const checkSlotAvailability = query({
  args: {
    seminarRequestId: v.id('seminar_requests'),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const seminarRequest = await ctx.db.get(args.seminarRequestId);
    if (!seminarRequest) {
      return { available: false, conflicts: ['Seminar tidak ditemukan'] };
    }

    const conflicts: string[] = [];
    const startMinutes = timeToMinutes(args.startTime);
    const endMinutes = timeToMinutes(args.endTime);

    // Get all lecturers
    const lecturerIds = [
      seminarRequest.supervisor1Id,
    ];
    if (seminarRequest.supervisor2Id) lecturerIds.push(seminarRequest.supervisor2Id);
    if (seminarRequest.examiner1Id) lecturerIds.push(seminarRequest.examiner1Id);
    if (seminarRequest.examiner2Id) lecturerIds.push(seminarRequest.examiner2Id);

    // Check each lecturer's schedule
    const dayName = parseDayName(new Date(args.date).toLocaleDateString('en-US', { weekday: 'long' }));

    for (const lecturerId of lecturerIds) {
      const schedules = await ctx.db
        .query('teaching_schedules')
        .withIndex('by_lecturer', (q) => q.eq('lecturerId', lecturerId))
        .collect();

      const lecturer = await ctx.db.get(lecturerId);

      for (const schedule of schedules) {
        if (parseDayName(schedule.day) !== dayName) continue;

        const scheduleStart = timeToMinutes(schedule.startTime);
        const scheduleEnd = timeToMinutes(schedule.endTime);

        // Check for overlap (with transition buffer)
        if (
          startMinutes < scheduleEnd + TRANSITION_GAP &&
          endMinutes > scheduleStart - TRANSITION_GAP
        ) {
          conflicts.push(`${lecturer?.name} memiliki jadwal ${schedule.activity} (${schedule.startTime} - ${schedule.endTime})`);
        }
      }
    }

    // Check for already scheduled seminars at the same time
    const scheduledSeminars = await ctx.db
      .query('seminar_requests')
      .filter((q) =>
        q.and(
          q.eq(q.field('status'), 'scheduled'),
          q.eq(q.field('scheduledDate'), args.date)
        )
      )
      .collect();

    for (const seminar of scheduledSeminars) {
      if (seminar._id === args.seminarRequestId) continue;

      const seminarStart = timeToMinutes(seminar.scheduledStartTime || seminar.scheduledTime || '08:00');
      const seminarEnd = timeToMinutes(seminar.scheduledEndTime || '10:00');

      if (startMinutes < seminarEnd && endMinutes > seminarStart) {
        conflicts.push(`Bentrok dengan seminar ${seminar.studentName} (${seminar.scheduledStartTime || seminar.scheduledTime})`);
      }
    }

    // Check global breaks
    for (const b of GLOBAL_BREAKS) {
      const breakStart = timeToMinutes(b.start);
      const breakEnd = timeToMinutes(b.end);
      if (startMinutes < breakEnd && endMinutes > breakStart) {
        conflicts.push(`Bentrok dengan waktu ${b.name} (${b.start} - ${b.end})`);
      }
    }

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  },
});

// Get available rooms for a specific time slot
export const getAvailableRooms = query({
  args: {
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm
    endTime: v.string(), // HH:mm
  },
  handler: async (ctx, args) => {
    // 1. Fetch all active rooms
    const allRooms = await ctx.db
      .query('rooms')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    if (allRooms.length === 0) {
      return [];
    }

    const startMinutes = timeToMinutes(args.startTime);
    const endMinutes = timeToMinutes(args.endTime);

    const dayNameDate = new Date(args.date).toLocaleDateString('en-US', { weekday: 'long' });
    const dayName = parseDayName(dayNameDate);

    // 2. Fetch teaching schedules for this day
    const daySchedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_day', (q) => q.eq('day', dayName))
      .collect();

    const usedRoomsInClasses = new Set<string>();

    for (const schedule of daySchedules) {
      if (!schedule.room) continue;

      const scheduleStart = timeToMinutes(schedule.startTime);
      const scheduleEnd = timeToMinutes(schedule.endTime);

      // Overlap condition
      if (startMinutes < scheduleEnd && endMinutes > scheduleStart) {
        usedRoomsInClasses.add(schedule.room.toLowerCase().trim());
      }
    }

    // 3. Fetch scheduled seminars on this date
    const scheduledSeminars = await ctx.db
      .query('seminar_requests')
      .filter((q) =>
        q.and(
          q.eq(q.field('status'), 'scheduled'),
          q.eq(q.field('scheduledDate'), args.date)
        )
      )
      .collect();

    const usedRoomsInSeminars = new Set<string>();

    for (const seminar of scheduledSeminars) {
      if (!seminar.scheduledRoom) continue;

      const seminarStart = timeToMinutes(seminar.scheduledStartTime || seminar.scheduledTime || '08:00');
      const seminarEnd = timeToMinutes(seminar.scheduledEndTime || '10:00');

      if (startMinutes < seminarEnd && endMinutes > seminarStart) {
        usedRoomsInSeminars.add(seminar.scheduledRoom.toLowerCase().trim());
      }
    }

    // 4. Filter available rooms
    const availableRooms = allRooms.filter((room) => {
      const roomNameLower = room.name.toLowerCase().trim();
      return !usedRoomsInClasses.has(roomNameLower) && !usedRoomsInSeminars.has(roomNameLower);
    });

    return availableRooms;
  },
});
