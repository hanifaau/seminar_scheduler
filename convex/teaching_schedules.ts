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
    day: v.string(),
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
      day: args.day,
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
        return {
          ...schedule,
          lecturer,
        };
      })
    );

    return schedulesWithLecturer;
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
