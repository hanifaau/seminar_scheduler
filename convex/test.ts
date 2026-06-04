import { query } from "./_generated/server";
import { v } from "convex/values";

export const testParse = query({
  args: { names: v.string() },
  handler: async (ctx, args) => {
    const parts = args.names.split(/[,/]/);
    const result = parts
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false;
        const lower = p.toLowerCase().replace(/\./g, '').trim();
        const titles = ['prof', 'dr', 'ir', 'st', 'mt', 'msc', 'meng', 'phd', 'eng', 'skom', 'ipu', 'aseaneng', 'msie', 'msi', 'mm'];
        
        const words = lower.split(' ').filter(Boolean);
        if (words.length > 0 && words.every(w => titles.includes(w))) {
          return false;
        }
        
        if (p.length < 3) return false;
        return true;
      });
      return result;
  },
});
