import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get all rooms
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('rooms').order('asc').collect();
  },
});

// Create a new room
export const create = mutation({
  args: {
    name: v.string(),
    capacity: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if room already exists
    const existing = await ctx.db
      .query('rooms')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();

    if (existing) {
      throw new Error(`Ruangan dengan nama ${args.name} sudah ada`);
    }

    const roomId = await ctx.db.insert('rooms', {
      name: args.name,
      capacity: args.capacity,
      location: args.location,
      status: args.status || 'active',
      createdAt: Date.now(),
    });

    return roomId;
  },
});

// Update a room
export const update = mutation({
  args: {
    id: v.id('rooms'),
    name: v.string(),
    capacity: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // Check if name is taken by another room
    if (updates.name) {
      const existing = await ctx.db
        .query('rooms')
        .withIndex('by_name', (q) => q.eq('name', updates.name))
        .first();

      if (existing && existing._id !== id) {
        throw new Error(`Ruangan dengan nama ${updates.name} sudah ada`);
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a room
export const remove = mutation({
  args: { id: v.id('rooms') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
