import { mutation } from './_generated/server';

export const deleteSchedules = mutation({
  handler: async (ctx, args: { ids: string[] }) => {
    // legacy
  }
});

export const deleteGhosts = mutation({
  handler: async (ctx) => {
    const schedules = await ctx.db.query('teaching_schedules').collect();
    const ghosts = schedules.filter(s => !s.groupId);
    for (const g of ghosts) {
      await ctx.db.delete(g._id);
    }
    return ghosts.length;
  }
});
