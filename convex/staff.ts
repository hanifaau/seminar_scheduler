import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get a single staff member by ID
export const get = query({
  args: { id: v.id('staff') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get all staff
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('staff').order('asc').collect();
  },
});

// Get all active staff
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('staff').collect();
    return all.filter((s) => s.status === 'active' || !s.status);
  },
});

// Create a new staff member
export const create = mutation({
  args: {
    name: v.string(),
    idPegawai: v.string(),
    nip: v.optional(v.string()),
    role: v.union(
      v.literal('admin_akademik'),
      v.literal('sekprodi'),
      v.literal('kaprodi'),
      v.literal('admin')
    ),
  },
  handler: async (ctx, args) => {
    // Check if idPegawai already exists
    const existing = await ctx.db
      .query('staff')
      .withIndex('by_idPegawai', (q) => q.eq('idPegawai', args.idPegawai))
      .first();

    if (existing) {
      throw new Error('ID Pegawai sudah terdaftar');
    }

    const now = Date.now();
    const staffId = await ctx.db.insert('staff', {
      name: args.name,
      idPegawai: args.idPegawai,
      nip: args.nip,
      role: args.role,
      status: 'active',
      createdAt: now,
    });
    return staffId;
  },
});

// Update a staff member
export const update = mutation({
  args: {
    id: v.id('staff'),
    name: v.optional(v.string()),
    idPegawai: v.optional(v.string()),
    nip: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal('admin_akademik'),
      v.literal('sekprodi'),
      v.literal('kaprodi'),
      v.literal('admin')
    )),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Pegawai tidak ditemukan');
    }

    // Check if new idPegawai conflicts with another staff
    if (updates.idPegawai && updates.idPegawai !== existing.idPegawai) {
      const conflict = await ctx.db
        .query('staff')
        .withIndex('by_idPegawai', (q) => q.eq('idPegawai', updates.idPegawai!))
        .first();
      if (conflict) {
        throw new Error('ID Pegawai sudah digunakan oleh pegawai lain');
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

// Remove a staff member
export const remove = mutation({
  args: { id: v.id('staff') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Pegawai tidak ditemukan');
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get staff by NIP
export const getByNip = query({
  args: { nip: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('staff')
      .withIndex('by_nip', (q) => q.eq('nip', args.nip))
      .first();
  },
});

// Get staff by ID Pegawai
export const getByIdPegawai = query({
  args: { idPegawai: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('staff')
      .withIndex('by_idPegawai', (q) => q.eq('idPegawai', args.idPegawai))
      .first();
  },
});

// Get staff by role
export const getByRole = query({
  args: {
    role: v.union(
      v.literal('admin_akademik'),
      v.literal('sekprodi'),
      v.literal('kaprodi'),
      v.literal('admin')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('staff')
      .withIndex('by_role', (q) => q.eq('role', args.role))
      .collect();
  },
});

// Search staff
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      return await ctx.db.query('staff').order('asc').collect();
    }

    const allStaff = await ctx.db.query('staff').collect();
    return allStaff.filter(
      (staff) =>
        staff.name.toLowerCase().includes(searchQuery) ||
        staff.idPegawai.toLowerCase().includes(searchQuery) ||
        (staff.nip && staff.nip.includes(searchQuery))
    );
  },
});
