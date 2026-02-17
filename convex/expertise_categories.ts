import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// TI Unand (Industrial Engineering) expertise categories
const TI_EXPERTISE_CATEGORIES = [
  { name: 'Manajemen Produksi', description: 'Perencanaan dan pengendalian sistem produksi' },
  { name: 'Ergonomi', description: 'Desain sistem kerja dan interaksi manusia-mesin' },
  { name: 'Supply Chain Management', description: 'Manajemen rantai pasok dan logistik' },
  { name: 'Riset Operasi', description: 'Optimisasi dan pengambilan keputusan' },
  { name: 'Manajemen Mutu', description: 'Pengendalian dan jaminan kualitas' },
  { name: 'Desain Produk', description: 'Perancangan dan pengembangan produk' },
  { name: 'Rekayasa Ekonomi', description: 'Analisis ekonomi teknik dan investasi' },
  { name: 'Simulasi Sistem', description: 'Pemodelan dan simulasi sistem industri' },
  { name: 'Keselamatan dan Kesehatan Kerja', description: 'Sistem K3 di tempat kerja' },
  { name: 'IT Industri', description: 'Teknologi informasi untuk sistem industri' },
];

// Get all expertise categories
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('expertise_categories').order('asc').collect();
  },
});

// Get expertise categories by names
export const getByNames = query({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query('expertise_categories').collect();
    return all.filter((cat) => args.names.includes(cat.name));
  },
});

// Create a new expertise category
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if category already exists
    const existing = await ctx.db
      .query('expertise_categories')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();

    if (existing) {
      throw new Error(`Kategori kepakaran "${args.name}" sudah ada`);
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert('expertise_categories', {
      name: args.name,
      description: args.description,
      createdAt: now,
    });
    return categoryId;
  },
});

// Seed default TI Unand expertise categories
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('expertise_categories').collect();
    if (existing.length > 0) {
      return { message: 'Kategori sudah ada', count: existing.length };
    }

    const now = Date.now();
    const insertedIds = [];

    for (const category of TI_EXPERTISE_CATEGORIES) {
      const id = await ctx.db.insert('expertise_categories', {
        ...category,
        createdAt: now,
      });
      insertedIds.push(id);
    }

    return { message: 'Kategori berhasil di-seed', count: insertedIds.length };
  },
});

// Reset and re-seed expertise categories
export const reseed = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all existing categories
    const existing = await ctx.db.query('expertise_categories').collect();
    for (const cat of existing) {
      await ctx.db.delete(cat._id);
    }

    // Seed new categories
    const now = Date.now();
    const insertedIds = [];

    for (const category of TI_EXPERTISE_CATEGORIES) {
      const id = await ctx.db.insert('expertise_categories', {
        ...category,
        createdAt: now,
      });
      insertedIds.push(id);
    }

    return { message: 'Kategori berhasil di-reset', count: insertedIds.length };
  },
});

// Remove an expertise category
export const remove = mutation({
  args: { id: v.id('expertise_categories') },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Kategori kepakaran tidak ditemukan');
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Update an expertise category
export const update = mutation({
  args: {
    id: v.id('expertise_categories'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Kategori kepakaran tidak ditemukan');
    }

    const updateData: Record<string, unknown> = { ...updates };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Search expertise categories
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchQuery = args.query.toLowerCase().trim();
    if (!searchQuery) {
      return await ctx.db.query('expertise_categories').order('asc').collect();
    }

    const all = await ctx.db.query('expertise_categories').collect();
    return all.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery) ||
      cat.description?.toLowerCase().includes(searchQuery)
    );
  },
});
