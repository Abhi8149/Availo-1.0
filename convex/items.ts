import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

/**
 * ITEMS MODULE WITH PAGINATION
 * 
 * This module handles item management with pagination and optimized search.
 * Uses database indexes for fast queries on large datasets.
 */

export const createItem = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    imageId: v.optional(v.string()),
    imageIds: v.optional(v.array(v.string())),
    offer: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
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
      imageIds: args.imageIds,
      offer: args.offer,
      barcode: args.barcode,
      brand: args.brand,
      inStock: args.inStock,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return itemId;
  },
});

export const getItemsByShop = query({
  args: { 
    shopId: v.id("shops"),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      // Paginated version
      return await ctx.db
        .query("items")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      // Legacy non-paginated version
      return await ctx.db
        .query("items")
        .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
        .order("desc")
        .collect();
    }
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
    imageId: v.optional(v.string()),
    imageIds: v.optional(v.array(v.string())),
    offer: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
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
    if (args.imageIds !== undefined) updates.imageIds = args.imageIds;
    if (args.offer !== undefined) updates.offer = args.offer;
    if (args.barcode !== undefined) updates.barcode = args.barcode;
    if (args.brand !== undefined) updates.brand = args.brand;
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
        (item.category && item.category.toLowerCase().includes(searchLower)) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
        (item.brand && item.brand.toLowerCase().includes(searchLower))
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

export const getItemByBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    if (!args.barcode.trim()) {
      return null;
    }
    
    const items = await ctx.db
      .query("items")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .collect();
    
    if (items.length === 0) {
      return null;
    }
    
    // Return the first item found with shop info
    const item = items[0];
    const shop = await ctx.db.get(item.shopId);
    
    return {
      ...item,
      shop,
    };
  },
});

export const getAllItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});