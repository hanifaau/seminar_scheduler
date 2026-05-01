import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get a single schedule by ID
export const get = query({
  args: { id: v.id('teaching_schedules') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get all schedules
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('teaching_schedules').order('asc').collect();
  },
});

// Create a new schedule entry
export const create = mutation({
  args: {
    lecturerId: v.id('lecturers'),
    courseId: v.optional(v.id('courses')),
    day: v.string(),
    shiftId: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    activity: v.string(),
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const scheduleId = await ctx.db.insert('teaching_schedules', {
      lecturerId: args.lecturerId,
      courseId: args.courseId,
      day: args.day,
      shiftId: args.shiftId,
      startTime: args.startTime,
      endTime: args.endTime,
      activity: args.activity,
      room: args.room,
      notes: args.notes,
      createdAt: now,
    });
    return scheduleId;
  },
});

// Create schedule with validation (for manual scheduling)
export const createWithValidation = mutation({
  args: {
    lecturerId: v.id('lecturers'),
    courseId: v.optional(v.id('courses')),
    day: v.string(),
    shiftId: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    activity: v.string(),
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Helper function to convert time to minutes
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Check for lecturer conflicts
    const lecturerSchedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_lecturer_day', (q) =>
        q.eq('lecturerId', args.lecturerId).eq('day', args.day)
      )
      .collect();

    const newStart = toMinutes(args.startTime);
    const newEnd = toMinutes(args.endTime);

    for (const schedule of lecturerSchedules) {
      const existingStart = toMinutes(schedule.startTime);
      const existingEnd = toMinutes(schedule.endTime);

      // Check for overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new Error(
          `Dosen sudah memiliki jadwal "${schedule.activity}" pada ${args.day} (${schedule.startTime} - ${schedule.endTime})`
        );
      }
    }

    // Check for room conflicts if room is specified
    if (args.room) {
      const allSchedules = await ctx.db
        .query('teaching_schedules')
        .withIndex('by_day', (q) => q.eq('day', args.day))
        .collect();

      const roomSchedules = allSchedules.filter(
        (s) => s.room?.toLowerCase() === args.room!.toLowerCase()
      );

      for (const schedule of roomSchedules) {
        const existingStart = toMinutes(schedule.startTime);
        const existingEnd = toMinutes(schedule.endTime);

        // Check for overlap
        if (newStart < existingEnd && newEnd > existingStart) {
          throw new Error(
            `Ruangan ${args.room} sudah digunakan pada ${args.day} (${schedule.startTime} - ${schedule.endTime})`
          );
        }
      }
    }

    // No conflicts, create schedule
    const now = Date.now();
    const scheduleId = await ctx.db.insert('teaching_schedules', {
      lecturerId: args.lecturerId,
      courseId: args.courseId,
      day: args.day,
      shiftId: args.shiftId,
      startTime: args.startTime,
      endTime: args.endTime,
      activity: args.activity,
      room: args.room,
      notes: args.notes,
      createdAt: now,
    });

    return scheduleId;
  },
});

// Bulk insert schedule entries
export const bulkInsert = mutation({
  args: {
    schedules: v.array(
      v.object({
        lecturerId: v.id('lecturers'),
        day: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        activity: v.string(),
        room: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds = [];

    for (const schedule of args.schedules) {
      const id = await ctx.db.insert('teaching_schedules', {
        ...schedule,
        createdAt: now,
      });
      insertedIds.push(id);
    }

    return insertedIds;
  },
});

// Update a schedule entry
export const update = mutation({
  args: {
    id: v.id('teaching_schedules'),
    lecturerId: v.optional(v.id('lecturers')),
    day: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    activity: v.optional(v.string()),
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Schedule not found');
    }

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Remove a schedule entry
export const remove = mutation({
  args: { id: v.id('teaching_schedules') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Schedule not found');
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get schedules by lecturer ID
export const getByLecturer = query({
  args: { lecturerId: v.id('lecturers') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('teaching_schedules')
      .withIndex('by_lecturer', (q) => q.eq('lecturerId', args.lecturerId))
      .order('asc')
      .collect();
  },
});

// Get schedules by day
export const getByDay = query({
  args: { day: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('teaching_schedules')
      .withIndex('by_day', (q) => q.eq('day', args.day))
      .order('asc')
      .collect();
  },
});

// Get all schedules with lecturer details
export const getAllWithLecturer = query({
  args: {},
  handler: async (ctx) => {
    const schedules = await ctx.db
      .query('teaching_schedules')
      .order('asc')
      .collect();

    const schedulesWithLecturer = await Promise.all(
      schedules.map(async (schedule) => {
        const lecturer = await ctx.db.get(schedule.lecturerId);
        const course = schedule.courseId ? await ctx.db.get(schedule.courseId) : null;
        return {
          ...schedule,
          lecturer,
          course,
        };
      })
    );

    return schedulesWithLecturer;
  },
});

// Get schedules by lecturer and day (for conflict checking)
export const getByLecturerAndDay = query({
  args: {
    lecturerId: v.id('lecturers'),
    day: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('teaching_schedules')
      .withIndex('by_lecturer_day', (q) =>
        q.eq('lecturerId', args.lecturerId).eq('day', args.day)
      )
      .collect();
  },
});

// Get schedules by room and day (for conflict checking)
export const getByRoomAndDay = query({
  args: {
    room: v.string(),
    day: v.string(),
  },
  handler: async (ctx, args) => {
    const allSchedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_day', (q) => q.eq('day', args.day))
      .collect();

    return allSchedules.filter(
      (s) => s.room?.toLowerCase() === args.room.toLowerCase()
    );
  },
});

// Remove all schedules for a lecturer
export const removeAllByLecturer = mutation({
  args: { lecturerId: v.id('lecturers') },
  handler: async (ctx, args) => {
    const schedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_lecturer', (q) => q.eq('lecturerId', args.lecturerId))
      .collect();

    for (const schedule of schedules) {
      await ctx.db.delete(schedule._id);
    }

    return schedules.length;
  },
});

// Import course schedules from MINIMALIST CSV with AUTO-MAPPING
// Format: Hari, Waktu, Mata Kuliah, Ruang, Dosen
// Logic: Find course by name, match lecturer names, and create schedules only for matched lecturers
export const importFromMinimalistCSV = mutation({
  args: {
    schedules: v.array(
      v.object({
        day: v.string(),           // e.g., "Senin"
        time: v.string(),          // e.g., "07.30 - 09.10"
        courseName: v.string(),    // Must match EXACTLY with Master Course name
        room: v.optional(v.string()),      // e.g., "Lab. Komputer 1"
        lecturerNames: v.optional(v.string()), // Must be provided by CSV, optional fallback
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let slotsImported = 0;
    let lecturersLinked = 0;
    let coursesNotFound: string[] = [];
    let lecturersNotFound: string[] = [];
    let duplicatesSkipped = 0;

    // Build course name -> course mapping
    const allCourses = await ctx.db.query('courses').collect();
    const courseMap = new Map<string, typeof allCourses[0]>();
    for (const course of allCourses) {
      courseMap.set(course.name.toLowerCase().trim(), course);
    }

    // Get all lecturers and build lookup maps
    const allLecturers = await ctx.db.query('lecturers').collect();
    const lecturerIdMap = new Map<string, typeof allLecturers[0]>();
    for (const lecturer of allLecturers) {
      lecturerIdMap.set(lecturer._id.toString(), lecturer);
    }

    // Get all existing schedules to check for duplicates
    const existingSchedules = await ctx.db.query('teaching_schedules').collect();
    const scheduleKeys = new Set<string>();
    for (const schedule of existingSchedules) {
      const key = `${schedule.lecturerId}-${schedule.day}-${schedule.startTime}-${schedule.endTime}`;
      scheduleKeys.add(key);
    }

    const parseLecturerKeywords = (names: string) =>
      names
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

    // Process each schedule entry
    for (const scheduleData of args.schedules) {
      const { day, time, courseName, room, lecturerNames } = scheduleData;
      const lecturerNamesTrimmed = lecturerNames ? lecturerNames.trim() : '';

      // Parse time range (format: "07.30 - 09.10" or "07:30-09:10")
      const timeParts = time.split('-').map((t) => t.trim());
      if (timeParts.length !== 2) {
        console.log(`[Import] Invalid time format: ${time}`);
        continue;
      }
      const [startTime, endTime] = timeParts;

      // Find course by name (exact match, case-insensitive)
      const course = courseMap.get(courseName.toLowerCase().trim());

      if (!course) {
        if (!coursesNotFound.includes(courseName)) {
          coursesNotFound.push(courseName);
        }
        continue;
      }

      const courseLecturerIds = new Set(
        (course.lecturerIds || []).map((lecturerId) => lecturerId.toString())
      );

      let targetLecturerIds: any[] = [];

      if (!lecturerNamesTrimmed) {
        // Fallback: use all course lecturers
        targetLecturerIds = Array.from(courseLecturerIds).map(
          (id) => lecturerIdMap.get(id)!._id
        );
      } else {
        const keywords = parseLecturerKeywords(lecturerNamesTrimmed);
        const matchedIds = new Set<string>();

        for (const keyword of keywords) {
          const matches = allLecturers.filter((lecturer) =>
            lecturer.name.toLowerCase().includes(keyword.toLowerCase())
          );

          if (matches.length === 0) {
            if (!lecturersNotFound.includes(keyword)) {
              lecturersNotFound.push(keyword);
            }
            continue;
          }

          for (const lecturer of matches) {
            const lecturerIdString = lecturer._id.toString();
            if (courseLecturerIds.size === 0 || courseLecturerIds.has(lecturerIdString)) {
              matchedIds.add(lecturerIdString);
            }
          }
        }

        const matchedLecturerIds = Array.from(matchedIds).map(
          (id) => lecturerIdMap.get(id)!._id
        );

        if (matchedLecturerIds.length === 0) {
          console.log(
            `[Import] Course "${courseName}" has no matching lecturers for specified names: ${lecturerNamesTrimmed}`
          );
          continue;
        }

        targetLecturerIds = matchedLecturerIds;
      }

      if (targetLecturerIds.length === 0) {
        console.log(
          `[Import] Course "${courseName}" has no lecturers assigned or no matching lecturer names for ${lecturerNames}`
        );
        continue;
      }

      // Create schedule entry for each lecturer
      for (const lecturerId of targetLecturerIds) {
        // Check for duplicate
        const scheduleKey = `${lecturerId}-${day}-${startTime}-${endTime}`;
        if (scheduleKeys.has(scheduleKey)) {
          duplicatesSkipped++;
          continue;
        }

        // Create schedule entry
        await ctx.db.insert('teaching_schedules', {
          lecturerId: lecturerId,
          courseId: course._id,
          day,
          startTime,
          endTime,
          activity: course.name,
          room: room || undefined,
          createdAt: now,
        });

        scheduleKeys.add(scheduleKey);
        lecturersLinked++;
      }

      slotsImported++;
    }

    console.log(`[Import] Complete: ${slotsImported} slots, ${lecturersLinked} lecturer schedules`);

    return {
      slotsImported,
      lecturersLinked,
      coursesNotFound,
      lecturersNotFound,
      duplicatesSkipped,
      message: `${slotsImported} slot berhasil diimpor dan dihubungkan ke ${lecturersLinked} jadwal dosen`,
    };
  },
});

// Legacy import - kept for backwards compatibility
// Import course schedules from CSV (handles 3 lecturer columns)
// Auto-creates lecturers if NIP doesn't exist
// Prevents duplicate entries
export const importCourseSchedule = mutation({
  args: {
    schedules: v.array(
      v.object({
        day: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        courseName: v.string(),
        room: v.string(),
        lecturerNIPs: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let schedulesCreated = 0;
    let lecturersCreated = 0;
    const lecturerCache = new Map<string, string>(); // NIP -> lecturerId

    // Get all existing lecturers to build cache
    const existingLecturers = await ctx.db.query('lecturers').collect();
    for (const lecturer of existingLecturers) {
      lecturerCache.set(lecturer.nip, lecturer._id);
    }

    // Get all existing schedules to check for duplicates
    const existingSchedules = await ctx.db.query('teaching_schedules').collect();
    const scheduleKeys = new Set<string>();

    for (const schedule of existingSchedules) {
      // Create a unique key for each schedule: lecturerId-day-startTime-endTime
      const key = `${schedule.lecturerId}-${schedule.day}-${schedule.startTime}-${schedule.endTime}`;
      scheduleKeys.add(key);
    }

    // Process each schedule entry
    for (const scheduleData of args.schedules) {
      const { day, startTime, endTime, courseName, room, lecturerNIPs } = scheduleData;

      // Process each lecturer in the schedule
      for (const nip of lecturerNIPs) {
        if (!nip || nip === '-' || nip === '') continue;

        // Get or create lecturer
        let lecturerId = lecturerCache.get(nip);

        if (!lecturerId) {
          // Create new lecturer with placeholder name
          lecturerId = await ctx.db.insert('lecturers', {
            name: `Dosen ${nip}`,
            nip: nip,
            expertise: [],
            status: 'active',
            createdAt: now,
          });
          lecturerCache.set(nip, lecturerId);
          lecturersCreated++;
        }

        // Check for duplicate
        const scheduleKey = `${lecturerId}-${day}-${startTime}-${endTime}`;
        if (scheduleKeys.has(scheduleKey)) {
          // Skip duplicate
          continue;
        }

        // Create schedule entry
        await ctx.db.insert('teaching_schedules', {
          lecturerId: lecturerId as any,
          day,
          startTime,
          endTime,
          activity: courseName,
          room: room || undefined,
          notes: undefined,
          createdAt: now,
        });

        scheduleKeys.add(scheduleKey);
        schedulesCreated++;
      }
    }

    return {
      schedulesCreated,
      lecturersCreated,
    };
  },
});

// Cleanup orphaned schedules (where lecturer no longer exists)
export const cleanupOrphanedSchedules = mutation({
  args: {},
  handler: async (ctx) => {
    const schedules = await ctx.db.query('teaching_schedules').collect();
    let deletedCount = 0;

    for (const schedule of schedules) {
      const lecturer = await ctx.db.get(schedule.lecturerId);
      // Jika dosen tidak ada (null), berarti jadwal ini orphaned data
      if (!lecturer) {
        await ctx.db.delete(schedule._id);
        deletedCount++;
      }
    }

    return { deletedCount, message: `Berhasil membersihkan ${deletedCount} jadwal mengajar yatim piatu.` };
  },
});
