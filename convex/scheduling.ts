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
}

interface LecturerBusySlot {
  startTime: number; // minutes from midnight
  endTime: number; // minutes from midnight
}

// Working hours configuration
const WORK_START = 8 * 60; // 08:00 in minutes
const WORK_END = 17 * 60; // 17:00 in minutes
const TRANSITION_GAP = 5; // 5 minutes transition buffer

// Duration requirements by seminar type (in minutes)
const DURATION_REQUIREMENTS: Record<string, number> = {
  Proposal: 60,
  Hasil: 90,
  Sidang: 90,
};

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

// Get lecturer busy slots for a specific day (including transition gap)
async function getLecturerBusySlotsForDay(
  ctx: any,
  lecturerId: string,
  day: string
): Promise<LecturerBusySlot[]> {
  const schedules = await ctx.db
    .query('teaching_schedules')
    .withIndex('by_lecturer', (q: any) => q.eq('lecturerId', lecturerId))
    .collect();

  const daySchedules = schedules.filter((s: any) => parseDayName(s.day) === parseDayName(day));

  return daySchedules.map((s: any) => ({
    startTime: timeToMinutes(s.startTime) - TRANSITION_GAP, // Add buffer before
    endTime: timeToMinutes(s.endTime) + TRANSITION_GAP, // Add buffer after
  }));
}

// Get already scheduled seminars for a specific date to avoid double booking
async function getScheduledSeminarsForDate(
  ctx: any,
  date: string
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

  return scheduledSeminars.map((s: any) => ({
    startTime: timeToMinutes(s.scheduledStartTime || s.scheduledTime || '08:00'),
    endTime: timeToMinutes(s.scheduledEndTime || '10:00'),
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
      merged.push(slot);
    } else {
      const last = merged[merged.length - 1];
      if (slot.startTime <= last.endTime) {
        // Overlapping, merge
        last.endTime = Math.max(last.endTime, slot.endTime);
      } else {
        merged.push(slot);
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

// Generate date strings for the next N weeks starting from a given date
function generateWeekDates(startDate: Date, weeksAhead: number = 2): Array<{ date: string; day: string }> {
  const dates: Array<{ date: string; day: string }> = [];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Start from the next Monday if today is weekend
  let currentDate = new Date(startDate);

  for (let week = 0; week < weeksAhead; week++) {
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
  }

  return dates;
}

// Main query: Get available slots for a seminar
export const getAvailableSlots = query({
  args: {
    seminarRequestId: v.id('seminar_requests'),
    weeksAhead: v.optional(v.number()), // How many weeks to search ahead (default 2)
  },
  handler: async (ctx, args) => {
    // Get the seminar request
    const seminarRequest = await ctx.db.get(args.seminarRequestId);
    if (!seminarRequest) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    // Get all 4 lecturers involved
    const lecturerIds: string[] = [
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

    // Get required duration
    const requiredDuration = DURATION_REQUIREMENTS[seminarRequest.type] || 60;
    const alternativeDuration = requiredDuration - 10; // Secondary search duration

    // Generate dates for the next N weeks
    const weeksAhead = args.weeksAhead || 2;
    const weekDates = generateWeekDates(new Date(), weeksAhead);

    const idealSlots: TimeSlot[] = [];
    const alternativeSlots: TimeSlot[] = [];

    // Check each date
    for (const dateInfo of weekDates) {
      // Get busy slots for all lecturers on this day
      const allLecturerBusySlots: LecturerBusySlot[][] = [];

      for (const lecturerId of lecturerIds) {
        const busySlots = await getLecturerBusySlotsForDay(ctx, lecturerId, dateInfo.day);
        allLecturerBusySlots.push(busySlots);
      }

      // Get scheduled seminars for this date to avoid double booking
      const scheduledSeminars = await getScheduledSeminarsForDate(ctx, dateInfo.date);

      // For each lecturer, find their free windows including scheduled seminars
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

        // Check for ideal slot
        if (windowDuration >= requiredDuration) {
          idealSlots.push({
            day: dateInfo.day,
            date: dateInfo.date,
            startTime: minutesToTime(window.start),
            endTime: minutesToTime(window.start + requiredDuration),
            type: 'ideal',
            availableDuration: windowDuration,
          });
        }
        // Check for alternative slot
        else if (windowDuration >= alternativeDuration) {
          alternativeSlots.push({
            day: dateInfo.day,
            date: dateInfo.date,
            startTime: minutesToTime(window.start),
            endTime: minutesToTime(window.start + alternativeDuration),
            type: 'alternative',
            availableDuration: windowDuration,
          });
        }
      }
    }

    // Return combined results with ideal slots first
    return {
      seminarRequest: {
        _id: seminarRequest._id,
        studentName: seminarRequest.studentName,
        nim: seminarRequest.nim,
        title: seminarRequest.title,
        type: seminarRequest.type,
      },
      requiredDuration,
      idealSlots,
      alternativeSlots,
      totalIdealSlots: idealSlots.length,
      totalAlternativeSlots: alternativeSlots.length,
    };
  },
});

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
    const lecturerIds: string[] = [
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

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  },
});
