import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// Get all shops with verification status for admin dashboard (with optional pagination)
export const getAllShopsForVerification = query({
  args: { 
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    // If pagination options provided, use paginated query
    if (args.paginationOpts) {
      const result = await ctx.db
        .query("shops")
        .order("desc")
        .paginate(args.paginationOpts);

      // Get shopkeeper details for each shop
      const shopsWithOwners = await Promise.all(
        result.page.map(async (shop) => {
          const owner = await ctx.db.get(shop.ownerUid);
          return {
            _id: shop._id,
            name: shop.name,
            category: shop.category,
            isOpen: shop.isOpen,
            isVerified: shop.isVerified || false,
            verifiedAt: shop.verifiedAt,
            createdAt: shop._creationTime,
            lastUpdated: shop.lastUpdated,
            ownerName: owner?.name || "Unknown",
            ownerEmail: owner?.email || "Unknown",
          };
        })
      );

      return {
        ...result,
        page: shopsWithOwners,
      };
    }

    // Otherwise, return all shops (backward compatible)
    const shops = await ctx.db
      .query("shops")
      .collect();

    // Get shopkeeper details for each shop
    const shopsWithOwners = await Promise.all(
      shops.map(async (shop) => {
        const owner = await ctx.db.get(shop.ownerUid);
        return {
          _id: shop._id,
          name: shop.name,
          category: shop.category,
          isOpen: shop.isOpen,
          isVerified: shop.isVerified || false,
          verifiedAt: shop.verifiedAt,
          createdAt: shop._creationTime,
          lastUpdated: shop.lastUpdated,
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email || "Unknown",
        };
      })
    );

    return shopsWithOwners.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Legacy function for backward compatibility - returns all shops
export const getAllShopsForVerificationLegacy = query({
  args: {},
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("shops")
      .collect();

    // Get shopkeeper details for each shop
    const shopsWithOwners = await Promise.all(
      shops.map(async (shop) => {
        const owner = await ctx.db.get(shop.ownerUid);
        return {
          _id: shop._id,
          name: shop.name,
          category: shop.category,
          isOpen: shop.isOpen,
          isVerified: shop.isVerified || false,
          verifiedAt: shop.verifiedAt,
          createdAt: shop._creationTime,
          lastUpdated: shop.lastUpdated,
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email || "Unknown",
        };
      })
    );

    return shopsWithOwners.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Verify a shop (set isVerified to true)
export const verifyShop = mutation({
  args: { 
    shopId: v.id("shops"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, notes }) => {
    await ctx.db.patch(shopId, {
      isVerified: true,
      verifiedAt: Date.now(),
    });

    console.log(`Shop ${shopId} verified${notes ? ` with notes: ${notes}` : ''}`);
    return { success: true };
  },
});

// Remove verification from a shop (set isVerified to false)
export const unverifyShop = mutation({
  args: { 
    shopId: v.id("shops"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { shopId, notes }) => {
    await ctx.db.patch(shopId, {
      isVerified: false,
      verifiedAt: undefined,
    });

    console.log(`Shop ${shopId} unverified${notes ? ` with notes: ${notes}` : ''}`);
    return { success: true };
  },
});

// Get verification statistics
export const getVerificationStats = query({
  args: {},
  handler: async (ctx) => {
    const allShops = await ctx.db.query("shops").collect();
    
    const total = allShops.length;
    const verified = allShops.filter(shop => shop.isVerified).length;
    const pending = total - verified;
    
    return {
      total,
      verified,
      pending,
      verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  },
});

// Get recently created shops (last 7 days) for monitoring
export const getRecentShops = query({
  args: {},
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const shops = await ctx.db
      .query("shops")
      .filter((q) => q.gte(q.field("_creationTime"), sevenDaysAgo))
      .collect();

    const shopsWithOwners = await Promise.all(
      shops.map(async (shop) => {
        const owner = await ctx.db.get(shop.ownerUid);
        return {
          _id: shop._id,
          name: shop.name,
          category: shop.category,
          isOpen: shop.isOpen,
          isVerified: shop.isVerified || false,
          verifiedAt: shop.verifiedAt,
          createdAt: shop._creationTime,
          lastUpdated: shop.lastUpdated,
          ownerName: owner?.name || "Unknown",
          ownerEmail: owner?.email || "Unknown",
        };
      })
    );

    return shopsWithOwners.sort((a, b) => b.createdAt - a.createdAt);
  },
});
