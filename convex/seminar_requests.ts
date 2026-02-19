import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get a single seminar request by ID
export const get = query({
  args: { id: v.id('seminar_requests') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Alias for get function (used in notifications.ts)
export const getSeminarRequestById = get;

// Get all seminar requests
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('seminar_requests').order('desc').collect();
  },
});

// Get seminar requests by status
export const getByStatus = query({
  args: { status: v.union(
    v.literal('requested'),
    v.literal('allocated'),
    v.literal('scheduled')
  )},
  handler: async (ctx, args) => {
    return await ctx.db
      .query('seminar_requests')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .collect();
  },
});

// Get all seminar requests with lecturer details
export const getAllWithLecturers = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query('seminar_requests')
      .order('desc')
      .collect();

    const requestsWithLecturers = await Promise.all(
      requests.map(async (request) => {
        const supervisor1 = await ctx.db.get(request.supervisor1Id);
        const supervisor2 = request.supervisor2Id
          ? await ctx.db.get(request.supervisor2Id)
          : null;
        const examiner1 = request.examiner1Id
          ? await ctx.db.get(request.examiner1Id)
          : null;
        const examiner2 = request.examiner2Id
          ? await ctx.db.get(request.examiner2Id)
          : null;

        return {
          ...request,
          supervisor1,
          supervisor2,
          examiner1,
          examiner2,
        };
      })
    );

    return requestsWithLecturers;
  },
});

// Get seminar requests by status with lecturer details
export const getByStatusWithLecturers = query({
  args: {
    status: v.union(
      v.literal('requested'),
      v.literal('allocated'),
      v.literal('scheduled')
    ),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query('seminar_requests')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')
      .collect();

    const requestsWithLecturers = await Promise.all(
      requests.map(async (request) => {
        const supervisor1 = await ctx.db.get(request.supervisor1Id);
        const supervisor2 = request.supervisor2Id
          ? await ctx.db.get(request.supervisor2Id)
          : null;
        const examiner1 = request.examiner1Id
          ? await ctx.db.get(request.examiner1Id)
          : null;
        const examiner2 = request.examiner2Id
          ? await ctx.db.get(request.examiner2Id)
          : null;

        return {
          ...request,
          supervisor1,
          supervisor2,
          examiner1,
          examiner2,
        };
      })
    );

    return requestsWithLecturers;
  },
});

// Create a new seminar request
export const create = mutation({
  args: {
    studentName: v.string(),
    nim: v.string(),
    title: v.string(),
    type: v.union(
      v.literal('Proposal'),
      v.literal('Hasil'),
      v.literal('Sidang')
    ),
    supervisor1Id: v.id('lecturers'), // Pembimbing Utama (wajib)
    supervisor2Id: v.optional(v.id('lecturers')), // Pembimbing Pendamping (opsional)
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestId = await ctx.db.insert('seminar_requests', {
      studentName: args.studentName,
      nim: args.nim,
      title: args.title,
      type: args.type,
      supervisor1Id: args.supervisor1Id,
      supervisor2Id: args.supervisor2Id,
      status: 'requested',
      notes: args.notes,
      createdAt: now,
    });
    return requestId;
  },
});

// Update a seminar request
export const update = mutation({
  args: {
    id: v.id('seminar_requests'),
    studentName: v.optional(v.string()),
    nim: v.optional(v.string()),
    title: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal('Proposal'),
      v.literal('Hasil'),
      v.literal('Sidang')
    )),
    supervisor1Id: v.optional(v.id('lecturers')),
    supervisor2Id: v.optional(v.id('lecturers')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Permohonan seminar tidak ditemukan');
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

// Allocate examiners to a seminar request with validation
export const allocateExaminers = mutation({
  args: {
    id: v.id('seminar_requests'),
    examiner1Id: v.id('lecturers'),
    examiner2Id: v.id('lecturers'),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    // Validasi: Penguji 1 dan 2 tidak boleh sama
    if (args.examiner1Id === args.examiner2Id) {
      throw new Error('Penguji 1 dan Penguji 2 tidak boleh dosen yang sama');
    }

    // Validasi: Penguji tidak boleh sama dengan Pembimbing Utama
    if (args.examiner1Id === existing.supervisor1Id || args.examiner2Id === existing.supervisor1Id) {
      throw new Error('Dosen Pembimbing Utama tidak boleh menjadi Penguji');
    }

    // Validasi: Penguji tidak boleh sama dengan Pembimbing Pendamping (jika ada)
    if (existing.supervisor2Id) {
      if (args.examiner1Id === existing.supervisor2Id || args.examiner2Id === existing.supervisor2Id) {
        throw new Error('Dosen Pembimbing Pendamping tidak boleh menjadi Penguji');
      }
    }

    await ctx.db.patch(args.id, {
      examiner1Id: args.examiner1Id,
      examiner2Id: args.examiner2Id,
      status: 'allocated',
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Validate examiner selection (for frontend preview)
export const validateExaminers = query({
  args: {
    requestId: v.id('seminar_requests'),
    examiner1Id: v.id('lecturers'),
    examiner2Id: v.id('lecturers'),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { valid: false, error: 'Permohonan seminar tidak ditemukan' };
    }

    // Check if examiners are the same
    if (args.examiner1Id === args.examiner2Id) {
      return { valid: false, error: 'Penguji 1 dan Penguji 2 tidak boleh dosen yang sama' };
    }

    // Check if examiner is supervisor 1
    if (args.examiner1Id === request.supervisor1Id || args.examiner2Id === request.supervisor1Id) {
      return { valid: false, error: 'Dosen Pembimbing Utama tidak boleh menjadi Penguji' };
    }

    // Check if examiner is supervisor 2 (if exists)
    if (request.supervisor2Id) {
      if (args.examiner1Id === request.supervisor2Id || args.examiner2Id === request.supervisor2Id) {
        return { valid: false, error: 'Dosen Pembimbing Pendamping tidak boleh menjadi Penguji' };
      }
    }

    return { valid: true, error: null };
  },
});

// Get supervisors for a seminar request
export const getSupervisors = query({
  args: { requestId: v.id('seminar_requests') },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const supervisor1 = await ctx.db.get(request.supervisor1Id);
    const supervisor2 = request.supervisor2Id
      ? await ctx.db.get(request.supervisor2Id)
      : null;

    return {
      supervisor1,
      supervisor2,
    };
  },
});

// Schedule a seminar (set date, time, room)
export const schedule = mutation({
  args: {
    id: v.id('seminar_requests'),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
    scheduledRoom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    await ctx.db.patch(args.id, {
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      scheduledRoom: args.scheduledRoom,
      status: 'scheduled',
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Remove a seminar request
export const remove = mutation({
  args: { id: v.id('seminar_requests') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get counts by status
export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('seminar_requests').collect();

    return {
      requested: all.filter((r) => r.status === 'requested').length,
      allocated: all.filter((r) => r.status === 'allocated').length,
      scheduled: all.filter((r) => r.status === 'scheduled').length,
      total: all.length,
    };
  },
});

// Search seminar requests
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      return await ctx.db.query('seminar_requests').order('desc').collect();
    }

    const all = await ctx.db.query('seminar_requests').collect();
    return all.filter(
      (request) =>
        request.studentName.toLowerCase().includes(searchQuery) ||
        request.nim.includes(searchQuery) ||
        request.title.toLowerCase().includes(searchQuery)
    );
  },
});
