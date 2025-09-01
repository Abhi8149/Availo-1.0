
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
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.photoUri !== undefined) updates.photoUri = args.photoUri;
    if (args.password !== undefined) updates.password = args.password;
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