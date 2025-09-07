import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createShop = mutation({
  args: {
    ownerUid: v.id("users"),
    name: v.string(),
    category: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    }),
    isOpen: v.boolean(),
    mobileNumber:v.string(),
    shopImageId: v.optional(v.id("_storage")), // Keep for backward compatibility
    shopImageIds: v.optional(v.array(v.id("_storage"))), // Multiple images
    estimatedTime: v.optional(v.object({
      hours: v.number(),
      minutes: v.number(),
      action: v.union(v.literal("opening"), v.literal("closing")),
    })),
    businessHours:v.object({
      openTime: v.string(), // Format: "09:00"
      closeTime: v.string(), // Format: "18:00"
    }),
    hasDelivery: v.optional(v.boolean()),
    deliveryRange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const shopId = await ctx.db.insert("shops", {
      ownerUid: args.ownerUid,
      name: args.name,
      category: args.category,
      location: args.location,
      isOpen: args.isOpen,
      mobileNumber: args.mobileNumber,
      shopImageId: args.shopImageId,
      shopImageIds: args.shopImageIds,
      estimatedTime: args.estimatedTime,
      businessHours: args.businessHours,
      hasDelivery: args.hasDelivery,
      deliveryRange: args.deliveryRange,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    });

    return shopId;
  },
});

export const getShopsByOwner = query({
  args: { ownerUid: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerUid", args.ownerUid))
      .collect();
  },
});

// Get shop by ID
export const getShopById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shopId);
  },
});

export const updateShopStatus = mutation({
  args: {
    shopId: v.id("shops"),
    isOpen: v.boolean(),
    estimatedTime: v.optional(v.object({
      hours: v.number(),
      minutes: v.number(),
      action: v.union(v.literal("opening"), v.literal("closing")),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.shopId, {
      isOpen: args.isOpen,
      estimatedTime: args.estimatedTime,
      lastUpdated: Date.now(),
    });
  },
});

export const updateShop = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    })),
    mobileNumber: v.optional(v.string()),
    shopImageId: v.optional(v.id("_storage")), // Keep for backward compatibility
    shopImageIds: v.optional(v.array(v.id("_storage"))), // Multiple images
    businessHours: v.object({
      openTime: v.string(), // Format: "09:00"
      closeTime: v.string(), // Format: "18:00"
    }),
    hasDelivery: v.optional(v.boolean()),
    deliveryRange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      lastUpdated: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.category !== undefined) updates.category = args.category;
    if (args.location !== undefined) updates.location = args.location;
    if (args.mobileNumber !== undefined) updates.mobileNumber = args.mobileNumber;
    if (args.shopImageId !== undefined) updates.shopImageId = args.shopImageId;
    if (args.shopImageIds !== undefined) updates.shopImageIds = args.shopImageIds;
    if (args.businessHours !== undefined) updates.businessHours = args.businessHours;
    if (args.hasDelivery !== undefined) updates.hasDelivery = args.hasDelivery;
    if (args.deliveryRange !== undefined) updates.deliveryRange = args.deliveryRange;

    await ctx.db.patch(args.shopId, updates);
  },
});

export const getAllShops = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("shops").collect();
  },
});

export const getShopsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

export const getOpenShops = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("shops")
      .withIndex("by_status", (q) => q.eq("isOpen", true))
      .collect();
  },
});

export const searchShops = query({
  args: { 
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    isOpen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let shops = await ctx.db.query("shops").collect();

    // Filter by category if provided
    if (args.category) {
      shops = shops.filter(shop => shop.category === args.category);
    }

    // Filter by status if provided
    if (args.isOpen !== undefined) {
      shops = shops.filter(shop => shop.isOpen === args.isOpen);
    }

    // Filter by search term if provided and not empty
    if (args.searchTerm && args.searchTerm.trim().length > 0) {
      const searchLower = args.searchTerm.toLowerCase().trim();
      shops = shops.filter(shop => 
        shop.name.toLowerCase().includes(searchLower) ||
        shop.category.toLowerCase().includes(searchLower) ||
        (shop.location.address && shop.location.address.toLowerCase().includes(searchLower))
      );
    }

    return shops;
  },
});

export const getShopImage = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});

export const clearExpiredEstimatedTimes = mutation({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db.query("shops").collect();
    const now = Date.now();
    
    for (const shop of shops) {
      if (shop.estimatedTime) {
        const { hours, minutes } = shop.estimatedTime;
        const estimatedTimeInMs = (hours * 60 + minutes) * 60 * 1000;
        const timeSinceLastUpdate = now - shop.lastUpdated;
        
        // If the estimated time has passed, clear it
        if (timeSinceLastUpdate >= estimatedTimeInMs) {
          await ctx.db.patch(shop._id, {
            estimatedTime: undefined,
          });
        }
      }
    }
  },
});

export const deleteShop = mutation({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.shopId);
  },
});

export const getShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.shopId);
  },
});