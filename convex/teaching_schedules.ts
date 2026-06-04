import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// --- GROUP MANAGEMENT ---

export const getGroups = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('schedule_groups').order('desc').collect();
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('schedule_groups', {
      name: args.name,
      type: args.type,
      isActive: args.isActive,
      createdAt: Date.now(),
    });
  },
});

export const toggleGroupActive = mutation({
  args: {
    id: v.id('schedule_groups'),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return args.id;
  },
});

export const deleteGroup = mutation({
  args: {
    id: v.id('schedule_groups'),
  },
  handler: async (ctx, args) => {
    // Delete all schedules associated with this group
    const schedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_group', (q) => q.eq('groupId', args.id))
      .collect();

    for (const schedule of schedules) {
      await ctx.db.delete(schedule._id);
    }

    // Delete the group itself
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// --- SCHEDULE MANAGEMENT ---

export const get = query({
  args: { id: v.id('teaching_schedules') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('teaching_schedules').order('asc').collect();
  },
});

export const create = mutation({
  args: {
    lecturerId: v.id('lecturers'),
    groupId: v.optional(v.id('schedule_groups')),
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
    return await ctx.db.insert('teaching_schedules', {
      ...args,
      createdAt: now,
    });
  },
});

export const createWithValidation = mutation({
  args: {
    lecturerId: v.id('lecturers'),
    groupId: v.optional(v.id('schedule_groups')),
    day: v.string(),
    shiftId: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    activity: v.string(),
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

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

      if (newStart < existingEnd && newEnd > existingStart) {
        throw new Error(
          `Dosen sudah memiliki jadwal "${schedule.activity}" pada ${args.day} (${schedule.startTime} - ${schedule.endTime})`
        );
      }
    }

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

        if (newStart < existingEnd && newEnd > existingStart) {
          throw new Error(
            `Ruangan ${args.room} sudah digunakan pada ${args.day} (${schedule.startTime} - ${schedule.endTime})`
          );
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert('teaching_schedules', {
      ...args,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('teaching_schedules'),
    lecturerId: v.optional(v.id('lecturers')),
    groupId: v.optional(v.id('schedule_groups')),
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

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await ctx.db.patch(id, updateData);
    return id;
  },
});

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
        const group = schedule.groupId ? await ctx.db.get(schedule.groupId) : null;
        return {
          ...schedule,
          lecturer,
          group,
        };
      })
    );

    return schedulesWithLecturer;
  },
});

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

// --- SMART IMPORT LOGIC ---

export const importSmartSchedule = mutation({
  args: {
    groupId: v.id('schedule_groups'),
    schedules: v.array(
      v.object({
        day: v.string(),
        date: v.optional(v.string()),
        startTime: v.string(),
        endTime: v.string(),
        activity: v.string(),
        room: v.optional(v.string()),
        lecturerNames: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let slotsImported = 0;
    let lecturersLinked = 0;
    let lecturersNotFound: string[] = [];
    let duplicatesSkipped = 0;

    // Get all lecturers and build lookup maps
    const allLecturers = await ctx.db.query('lecturers').collect();

    // Prevent duplicates within the same import execution
    const scheduleKeys = new Set<string>();

    const parseLecturerKeywords = (names: string) => {
      // Pisahkan berdasarkan koma ATAU garis miring (untuk jadwal UTS)
      const parts = names.split(/[,/]/);
      return parts
        .map((p) => p.trim())
        .filter((p) => {
          if (!p) return false;
          // Abaikan jika bagian ini murni hanya berisi gelar
          const lower = p.toLowerCase().replace(/\./g, '').trim();
          const titles = ['prof', 'dr', 'ir', 'st', 'mt', 'msc', 'meng', 'phd', 'eng', 'skom', 'ipu', 'aseaneng', 'msie', 'msi', 'mm'];
          
          // Cek apakah semua kata dalam string ini adalah gelar (misal: "prof dr eng")
          const words = lower.split(' ').filter(Boolean);
          if (words.length > 0 && words.every(w => titles.includes(w))) {
            return false;
          }
          
          if (p.length < 3) return false;
          return true;
        });
    };

    for (const scheduleData of args.schedules) {
      const { day, date, startTime, endTime, activity, room, lecturerNames } = scheduleData;
      const lecturerNamesTrimmed = lecturerNames.trim();

      if (!lecturerNamesTrimmed) continue;

      const keywords = parseLecturerKeywords(lecturerNamesTrimmed);
      const matchedLecturerIds = new Set<string>();

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
          matchedLecturerIds.add(lecturer._id.toString());
        }
      }

      if (matchedLecturerIds.size === 0) {
        continue; // No valid lecturers found for this row
      }

      for (const lecturerIdStr of Array.from(matchedLecturerIds)) {
        const lecturerId = lecturerIdStr as any;

        const scheduleKey = `${lecturerId}-${date || day}-${startTime}-${endTime}`;
        if (scheduleKeys.has(scheduleKey)) {
          duplicatesSkipped++;
          continue;
        }

        await ctx.db.insert('teaching_schedules', {
          lecturerId: lecturerId,
          groupId: args.groupId,
          day,
          date: date || undefined,
          startTime,
          endTime,
          activity,
          room: room || undefined,
          createdAt: now,
        });

        scheduleKeys.add(scheduleKey);
        lecturersLinked++;
      }

      slotsImported++;
    }

    return {
      slotsImported,
      lecturersLinked,
      lecturersNotFound,
      duplicatesSkipped,
      message: `${slotsImported} slot berhasil diimpor ke grup jadwal, terhubung ke ${lecturersLinked} sesi dosen.`,
    };
  },
});
