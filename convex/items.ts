import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createItem = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    offer: v.optional(v.string()),
    inStock: v.boolean(),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("items", {
      shopId: args.shopId,
      name: args.name,
      description: args.description,
      price: args.price,
      priceDescription: args.priceDescription,
      category: args.category,
      imageId: args.imageId,
      offer: args.offer,
      inStock: args.inStock,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return itemId;
  },
});

export const getItemsByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("items"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    offer: v.optional(v.string()),
    inStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.priceDescription !== undefined) updates.priceDescription = args.priceDescription;
    if (args.category !== undefined) updates.category = args.category;
    if (args.imageId !== undefined) updates.imageId = args.imageId;
    if (args.offer !== undefined) updates.offer = args.offer;
    if (args.inStock !== undefined) updates.inStock = args.inStock;
    await ctx.db.patch(args.itemId, updates);
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.itemId);
  },
});

export const searchItems = query({
  args: {
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    inStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("items").collect();

    // Filter by category if provided
    if (args.category) {
      items = items.filter(item => item.category === args.category);
    }

    // Filter by stock status if provided
    if (args.inStock !== undefined) {
      items = items.filter(item => item.inStock === args.inStock);
    }

    // Filter by search term if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.category && item.category.toLowerCase().includes(searchLower))
      );
    }

    return items;
  },
});

export const getItemsWithShopInfo = query({
  args: {
    searchTerm: v.optional(v.string()),
    category: v.optional(v.string()),
    inStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("items").collect();

    // Filter by category if provided
    if (args.category) {
      items = items.filter(item => item.category === args.category);
    }

    // Filter by stock status if provided
    if (args.inStock !== undefined) {
      items = items.filter(item => item.inStock === args.inStock);
    }

    // Filter by search term if provided and not empty
    if (args.searchTerm && args.searchTerm.trim().length > 0) {
      const searchLower = args.searchTerm.toLowerCase().trim();
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.category && item.category.toLowerCase().includes(searchLower))
      );
    }

    // Get shop info for each item
    const itemsWithShopInfo = await Promise.all(
      items.map(async (item) => {
        const shop = await ctx.db.get(item.shopId);
        return {
          ...item,
          shop,
        };
      })
    );

    return itemsWithShopInfo;
  },
});

export const getItemImage = query({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.imageId);
  },
});