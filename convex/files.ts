import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const saveImageId = mutation({
  args: { 
    storageId: v.id("_storage"),
    itemId: v.optional(v.id("items")),
  },
  handler: async (ctx, args) => {
    if (args.itemId) {
      await ctx.db.patch(args.itemId, {
        imageId: args.storageId,
        updatedAt: Date.now(),
      });
    }
    return args.storageId;
  },
});