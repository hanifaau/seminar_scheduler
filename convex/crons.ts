import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

// This cron job runs every day at 00:01 Asia/Jakarta (midnight)
crons.daily(
  "Update lecturer statuses based on activeReturnDate",
  { hourUTC: 17, minuteUTC: 1 }, // 17:01 UTC is 00:01 WIB (UTC+7)
  internal.crons.updateLecturerStatuses
);

export const updateLecturerStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get today's date in YYYY-MM-DD format (WIB timezone)
    const now = new Date();
    // Offset for WIB (UTC+7)
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = wibNow.toISOString().split('T')[0];

    // Find all lecturers on leave
    const lecturersOnLeave = await ctx.db
      .query("lecturers")
      .filter((q) => q.eq(q.field("status"), "on leave"))
      .collect();

    let updatedCount = 0;

    for (const lecturer of lecturersOnLeave) {
      if (lecturer.activeReturnDate && lecturer.activeReturnDate <= todayStr) {
        // Return date has arrived or passed, set back to active
        await ctx.db.patch(lecturer._id, {
          status: "active",
          activeReturnDate: undefined, // clear the return date
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    console.log(`Cron updateLecturerStatuses finished: updated ${updatedCount} lecturers.`);
  },
});

export default crons;
