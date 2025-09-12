
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    photoUri: v.optional(v.string()),
    password: v.optional(v.string()),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    })),
    oneSignalPlayerId: v.optional(v.string()),
    pushNotificationsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.photoUri !== undefined) updates.photoUri = args.photoUri;
    if (args.password !== undefined) updates.password = args.password;
    if (args.location !== undefined) {
      updates.location = {
        ...args.location,
        lastUpdated: Date.now(),
      };
    }
    if (args.oneSignalPlayerId !== undefined) updates.oneSignalPlayerId = args.oneSignalPlayerId;
    if (args.pushNotificationsEnabled !== undefined) updates.pushNotificationsEnabled = args.pushNotificationsEnabled;
    await ctx.db.patch(args.userId, updates);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal("shopkeeper"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      password: args.password, // Store password (in production, this should be hashed)
      role: args.role,
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const getUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const authenticateUser = mutation({
  args: { 
    email: v.string(),
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password set
    if (!user.password) {
      throw new Error("This account was created before password authentication was implemented. Please use the forgot password feature to set up a password.");
    }

    // Check password
    if (user.password !== args.password) {
      throw new Error("Invalid email or password");
    }

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const deleteUserAccount = mutation({
  args: { 
    userId: v.id("users"),
    password: v.string()
  },
  handler: async (ctx, args) => {
    // Get the user first
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify password
    if (!user.password || user.password !== args.password) {
      throw new Error("Incorrect password");
    }

    // Delete all user-related data
    
    // 1. Delete user's shops if they are a shopkeeper
    const userShops = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerUid", args.userId))
      .collect();
    
    const deletedAdvertisementIds: any[] = [];
    
    for (const shop of userShops) {
      // Delete all items in each shop
      const shopItems = await ctx.db
        .query("items")
        .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
        .collect();
      
      for (const item of shopItems) {
        await ctx.db.delete(item._id);
      }
      
      // Get all advertisements for this shop (to track for notification cleanup)
      const shopAds = await ctx.db
        .query("advertisements")
        .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
        .collect();
      
      // Collect advertisement IDs for notification cleanup
      deletedAdvertisementIds.push(...shopAds.map(ad => ad._id));
      
      // Delete all advertisements for each shop
      for (const ad of shopAds) {
        await ctx.db.delete(ad._id);
      }
      
      // Delete the shop
      await ctx.db.delete(shop._id);
    }

    // 2. Delete ALL notifications related to this shopkeeper's advertisements
    // This includes notifications sent to OTHER customers about these advertisements
    for (const advertisementId of deletedAdvertisementIds) {
      const adNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_advertisement", (q) => q.eq("advertisementId", advertisementId))
        .collect();
      
      for (const notification of adNotifications) {
        await ctx.db.delete(notification._id);
      }
    }

    // 3. Delete user's notifications (where this user was the recipient)
    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", args.userId))
      .collect();
    
    for (const notification of userNotifications) {
      await ctx.db.delete(notification._id);
    }

    // 4. Delete user's verification codes
    const userCodes = await ctx.db
      .query("verificationCodes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId.toString()))
      .collect();
    
    for (const code of userCodes) {
      await ctx.db.delete(code._id);
    }

    // 5. Delete user's password reset codes
    const userResetCodes = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => q.eq(q.field("email"), user.email))
      .collect();
    
    for (const resetCode of userResetCodes) {
      await ctx.db.delete(resetCode._id);
    }

    // 6. Clean up any remaining notifications by shop (double-check cleanup)
    for (const shop of userShops) {
      const remainingShopNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
        .collect();
      
      for (const notification of remainingShopNotifications) {
        await ctx.db.delete(notification._id);
      }
    }

    // 7. Finally, delete the user
    await ctx.db.delete(args.userId);

    return { success: true, message: "Account and all related data deleted successfully" };
  },
});

// Location and OneSignal related functions
export const updateUserLocation = mutation({
  args: {
    userId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      location: {
        lat: args.lat,
        lng: args.lng,
        address: args.address,
        lastUpdated: Date.now(),
      },
    });
  },
});

export const updateOneSignalPlayerId = mutation({
  args: {
    userId: v.id("users"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      oneSignalPlayerId: args.playerId,
      pushNotificationsEnabled: true,
    });
  },
});

export const getNearbyUsers = query({
  args: {
    shopLat: v.number(),
    shopLng: v.number(),
    radiusKm: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all users with location data and push notifications enabled
    const allUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.neq(q.field("location"), undefined),
          q.neq(q.field("oneSignalPlayerId"), undefined),
          q.eq(q.field("pushNotificationsEnabled"), true)
        )
      )
      .collect();

    // Filter users within radius using Haversine formula
    const nearbyUsers = allUsers.filter(user => {
      if (!user.location) return false;
      
      const distance = calculateDistance(
        args.shopLat,
        args.shopLng,
        user.location.lat,
        user.location.lng
      );
      console.log("The radius set by shopkeeper is",args.radiusKm);
      return distance <= args.radiusKm;
    });

    return nearbyUsers.map(user => ({
      _id: user._id,
      name: user.name,
      oneSignalPlayerId: user.oneSignalPlayerId,
      location: user.location,
    }));
  },
});

export const getNearbyUsersForInApp = query({
  args: {
    shopLat: v.number(),
    shopLng: v.number(),
    radiusKm: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all users with location data and push notifications enabled
    const allUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.neq(q.field("location"), undefined)
        )
      )
      .collect();

    // Filter users within radius using Haversine formula
    const nearbyUsers = allUsers.filter(user => {
      if (!user.location) return false;
      
      const distance = calculateDistance(
        args.shopLat,
        args.shopLng,
        user.location.lat,
        user.location.lng
      );
      console.log("The radius set by shopkeeper is",args.radiusKm);
      return distance <= args.radiusKm;
    });
    console.log("Nearby users and there addresses are",nearbyUsers);
    return nearbyUsers.map(user => ({
      _id: user._id,
      name: user.name,
      location: user.location,
    }));
  },
});
// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  console.log("Distance calculated by calculateDistance is",distance);
  return distance;
}