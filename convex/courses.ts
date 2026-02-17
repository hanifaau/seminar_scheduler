import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get all courses
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('courses').order('asc').collect();
  },
});

// Get courses by SKS
export const getBySks = query({
  args: { sks: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('courses')
      .withIndex('by_sks', (q) => q.eq('sks', args.sks))
      .collect();
  },
});

// Get a single course by ID
export const get = query({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new course
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    sks: v.number(),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if course code already exists
    const existing = await ctx.db
      .query('courses')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .first();

    if (existing) {
      throw new Error(`Mata kuliah dengan kode ${args.code} sudah ada`);
    }

    const now = Date.now();
    const courseId = await ctx.db.insert('courses', {
      code: args.code,
      name: args.name,
      sks: args.sks,
      semester: args.semester,
      description: args.description,
      createdAt: now,
    });

    return courseId;
  },
});

// Update a course
export const update = mutation({
  args: {
    id: v.id('courses'),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    sks: v.optional(v.number()),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Mata kuliah tidak ditemukan');
    }

    // If updating code, check for duplicates
    if (updates.code && updates.code !== existing.code) {
      const duplicate = await ctx.db
        .query('courses')
        .withIndex('by_code', (q) => q.eq('code', updates.code!))
        .first();

      if (duplicate) {
        throw new Error(`Mata kuliah dengan kode ${updates.code} sudah ada`);
      }
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

// Remove a course
export const remove = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Mata kuliah tidak ditemukan');
    }

    // Check if course is used in any teaching schedule
    const schedules = await ctx.db
      .query('teaching_schedules')
      .withIndex('by_course', (q) => q.eq('courseId', args.id))
      .collect();

    if (schedules.length > 0) {
      throw new Error('Mata kuliah tidak dapat dihapus karena sudah digunakan dalam jadwal');
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Search courses
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      return await ctx.db.query('courses').order('asc').collect();
    }

    const all = await ctx.db.query('courses').collect();
    return all.filter(
      (course) =>
        course.code.toLowerCase().includes(searchQuery) ||
        course.name.toLowerCase().includes(searchQuery)
    );
  },
});

// Seed default courses for TI Unand
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('courses').collect();
    if (existing.length > 0) {
      return { message: 'Mata kuliah sudah ada', count: existing.length };
    }

    const defaultCourses = [
      { code: 'TI101', name: 'Metode Statistik', sks: 3, semester: 1 },
      { code: 'TI102', name: 'Pengantar Teknik Industri', sks: 2, semester: 1 },
      { code: 'TI201', name: 'Perencanaan dan Pengendalian Produksi', sks: 3, semester: 3 },
      { code: 'TI202', name: 'Ergonomi', sks: 3, semester: 3 },
      { code: 'TI203', name: 'Sistem Produksi', sks: 2, semester: 3 },
      { code: 'TI301', name: 'Manajemen Mutu', sks: 3, semester: 5 },
      { code: 'TI302', name: 'Riset Operasi', sks: 3, semester: 5 },
      { code: 'TI303', name: 'Supply Chain Management', sks: 2, semester: 5 },
      { code: 'TI401', name: 'Desain Sistem Kerja', sks: 3, semester: 7 },
      { code: 'TI402', name: 'Simulasi Sistem', sks: 3, semester: 7 },
      { code: 'TI403', name: 'Rekayasa Ekonomi', sks: 2, semester: 7 },
    ];

    const now = Date.now();
    const insertedIds = [];

    for (const course of defaultCourses) {
      const id = await ctx.db.insert('courses', {
        ...course,
        createdAt: now,
      });
      insertedIds.push(id);
    }

    return { message: 'Mata kuliah berhasil ditambahkan', count: insertedIds.length };
  },
});
