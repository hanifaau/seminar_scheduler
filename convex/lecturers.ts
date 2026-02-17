import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get a single lecturer by ID
export const get = query({
  args: { id: v.id('lecturers') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get all lecturers
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('lecturers').order('asc').collect();
  },
});

// Create a new lecturer
export const create = mutation({
  args: {
    name: v.string(),
    nip: v.string(),
    phone: v.optional(v.string()),
    expertise: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if NIP already exists
    const existing = await ctx.db
      .query('lecturers')
      .withIndex('by_nip', (q) => q.eq('nip', args.nip))
      .first();

    if (existing) {
      throw new Error(`Dosen dengan NIP ${args.nip} sudah ada`);
    }

    const now = Date.now();
    const lecturerId = await ctx.db.insert('lecturers', {
      name: args.name,
      nip: args.nip,
      phone: args.phone,
      expertise: args.expertise ?? [],
      status: args.status ?? 'active',
      createdAt: now,
    });
    return lecturerId;
  },
});

// Update a lecturer
export const update = mutation({
  args: {
    id: v.id('lecturers'),
    name: v.optional(v.string()),
    nip: v.optional(v.string()),
    phone: v.optional(v.string()),
    expertise: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Dosen tidak ditemukan');
    }

    // If updating NIP, check for duplicates
    if (updates.nip && updates.nip !== existing.nip) {
      const duplicate = await ctx.db
        .query('lecturers')
        .withIndex('by_nip', (q) => q.eq('nip', updates.nip!))
        .first();

      if (duplicate && duplicate._id !== id) {
        throw new Error(`Dosen dengan NIP ${updates.nip} sudah ada`);
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

// Update lecturer expertise
export const updateExpertise = mutation({
  args: {
    id: v.id('lecturers'),
    expertise: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Dosen tidak ditemukan');
    }

    await ctx.db.patch(args.id, {
      expertise: args.expertise,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Remove a lecturer
export const remove = mutation({
  args: { id: v.id('lecturers') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Lecturer not found');
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Search lecturers by expertise
export const searchByExpertise = query({
  args: { expertise: v.string() },
  handler: async (ctx, args) => {
    const allLecturers = await ctx.db.query('lecturers').collect();
    return allLecturers.filter((lecturer) =>
      lecturer.expertise.some((exp) =>
        exp.toLowerCase().includes(args.expertise.toLowerCase())
      )
    );
  },
});

// Search lecturers by name or NIP
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      return await ctx.db.query('lecturers').order('asc').collect();
    }

    const allLecturers = await ctx.db.query('lecturers').collect();
    return allLecturers.filter(
      (lecturer) =>
        lecturer.name.toLowerCase().includes(searchQuery) ||
        lecturer.nip.includes(searchQuery)
    );
  },
});

// Get lecturer by NIP
export const getByNip = query({
  args: { nip: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('lecturers')
      .withIndex('by_nip', (q) => q.eq('nip', args.nip))
      .first();
  },
});

// Get lecturers by role
export const getByRole = query({
  args: {
    role: v.optional(v.union(
      v.literal('dosen'),
      v.literal('kaprodi'),
      v.literal('sekprodi')
    )),
  },
  handler: async (ctx, args) => {
    if (!args.role) {
      return await ctx.db.query('lecturers').order('asc').collect();
    }
    return await ctx.db
      .query('lecturers')
      .withIndex('by_role', (q) => q.eq('role', args.role))
      .collect();
  },
});

// Get current Kaprodi
export const getKaprodi = query({
  args: {},
  handler: async (ctx) => {
    const kaprodiList = await ctx.db
      .query('lecturers')
      .withIndex('by_role', (q) => q.eq('role', 'kaprodi'))
      .collect();

    // Filter to only active
    const activeKaprodi = kaprodiList.filter(
      (l) => l.status === 'active' || !l.status
    );

    return activeKaprodi[0] || null;
  },
});

// Get current Sekprodi
export const getSekprodi = query({
  args: {},
  handler: async (ctx) => {
    const sekprodiList = await ctx.db
      .query('lecturers')
      .withIndex('by_role', (q) => q.eq('role', 'sekprodi'))
      .collect();

    // Filter to only active
    const activeSekprodi = sekprodiList.filter(
      (l) => l.status === 'active' || !l.status
    );

    return activeSekprodi[0] || null;
  },
});

// Get department leadership (Kaprodi & Sekprodi)
export const getLeadership = query({
  args: {},
  handler: async (ctx) => {
    const [kaprodi, sekprodi] = await Promise.all([
      ctx.db
        .query('lecturers')
        .withIndex('by_role', (q) => q.eq('role', 'kaprodi'))
        .collect(),
      ctx.db
        .query('lecturers')
        .withIndex('by_role', (q) => q.eq('role', 'sekprodi'))
        .collect(),
    ]);

    return {
      kaprodi: kaprodi.find((l) => l.status === 'active' || !l.status) || null,
      sekprodi: sekprodi.find((l) => l.status === 'active' || !l.status) || null,
    };
  },
});

// Assign role to lecturer (Kaprodi/Sekprodi)
export const assignRole = mutation({
  args: {
    id: v.id('lecturers'),
    role: v.union(
      v.literal('dosen'),
      v.literal('kaprodi'),
      v.literal('sekprodi')
    ),
  },
  handler: async (ctx, args) => {
    const lecturer = await ctx.db.get(args.id);
    if (!lecturer) {
      throw new Error('Dosen tidak ditemukan');
    }

    // If assigning Kaprodi or Sekprodi, check if there's already one active
    if (args.role === 'kaprodi' || args.role === 'sekprodi') {
      const existingRoleHolders = await ctx.db
        .query('lecturers')
        .withIndex('by_role', (q) => q.eq('role', args.role))
        .collect();

      const activeRoleHolder = existingRoleHolders.find(
        (l) => (l.status === 'active' || !l.status) && l._id !== args.id
      );

      if (activeRoleHolder) {
        throw new Error(
          `Sudah ada ${args.role === 'kaprodi' ? 'Kaprodi' : 'Sekprodi'} aktif: ${activeRoleHolder.name}. Nonaktifkan terlebih dahulu.`
        );
      }
    }

    await ctx.db.patch(args.id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Remove role from lecturer (set back to 'dosen')
export const removeRole = mutation({
  args: {
    id: v.id('lecturers'),
  },
  handler: async (ctx, args) => {
    const lecturer = await ctx.db.get(args.id);
    if (!lecturer) {
      throw new Error('Dosen tidak ditemukan');
    }

    await ctx.db.patch(args.id, {
      role: 'dosen',
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Update lecturer with role
export const updateWithRole = mutation({
  args: {
    id: v.id('lecturers'),
    name: v.optional(v.string()),
    nip: v.optional(v.string()),
    expertise: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal('dosen'),
      v.literal('kaprodi'),
      v.literal('sekprodi')
    )),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Dosen tidak ditemukan');
    }

    // If updating role to kaprodi/sekprodi, check for existing
    if (updates.role && (updates.role === 'kaprodi' || updates.role === 'sekprodi')) {
      const existingRoleHolders = await ctx.db
        .query('lecturers')
        .withIndex('by_role', (q) => q.eq('role', updates.role!))
        .collect();

      const activeRoleHolder = existingRoleHolders.find(
        (l) => (l.status === 'active' || !l.status) && l._id !== id
      );

      if (activeRoleHolder) {
        throw new Error(
          `Sudah ada ${updates.role === 'kaprodi' ? 'Kaprodi' : 'Sekprodi'} aktif: ${activeRoleHolder.name}`
        );
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
