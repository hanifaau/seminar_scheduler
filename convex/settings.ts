import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getAcademicCalendar = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'academic_calendar'))
      .first();

    if (!record) {
      return {
        semesterStartDate: null,
        utsStartDate: null,
        utsEndDate: null,
      };
    }
    return record.value;
  },
});

export const updateAcademicCalendar = mutation({
  args: {
    semesterStartDate: v.optional(v.string()), // YYYY-MM-DD
    utsStartDate: v.optional(v.string()),
    utsEndDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'academic_calendar'))
      .first();

    const value = {
      semesterStartDate: args.semesterStartDate || null,
      utsStartDate: args.utsStartDate || null,
      utsEndDate: args.utsEndDate || null,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('settings', {
        key: 'academic_calendar',
        value,
        updatedAt: Date.now(),
      });
    }
  },
});
