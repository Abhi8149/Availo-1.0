import { query } from "./_generated/server";
import { v } from "convex/values";

// Backward compatibility - now just returns the URL directly


// Helper to get multiple image URLs

// Add this to files.ts for migration only
export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});