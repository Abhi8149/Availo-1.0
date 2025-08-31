import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createAdvertisement = mutation({
  args: {
    shopId: v.id("shops"),
    shopOwnerId: v.id("users"),
    message: v.string(),
    imageIds: v.optional(v.array(v.id("_storage"))),
    videoIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const advertisementId = await ctx.db.insert("advertisements", {
      shopId: args.shopId,
      shopOwnerId: args.shopOwnerId,
      message: args.message,
      imageIds: args.imageIds,
      videoIds: args.videoIds,
      isActive: true,
      notificationsSent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return advertisementId;
  },
});

export const getAdvertisementsByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("advertisements")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();
  },
});

export const getActiveAdvertisementByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("advertisements")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const updateAdvertisement = mutation({
  args: {
    advertisementId: v.id("advertisements"),
    message: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    videoIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.message !== undefined) updates.message = args.message;
    if (args.imageIds !== undefined) updates.imageIds = args.imageIds;
    if (args.videoIds !== undefined) updates.videoIds = args.videoIds;

    await ctx.db.patch(args.advertisementId, updates);
  },
});

export const deleteAdvertisement = mutation({
  args: { advertisementId: v.id("advertisements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.advertisementId);
  },
});

export const sendNotificationsToNearbyUsers = mutation({
  args: {
    advertisementId: v.id("advertisements"),
    shopLat: v.number(),
    shopLng: v.number(),
    radiusKm: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the advertisement
    const advertisement = await ctx.db.get(args.advertisementId);
    if (!advertisement) {
      throw new Error("Advertisement not found");
    }

    // Get all users (in a real app, you'd filter by location)
    const users = await ctx.db.query("users").collect();
    
    // For now, we'll send to all users as a demo
    // In a real implementation, you'd filter users by location
    const nearbyUsers = users.filter(user => user.role === "customer");

    let notificationCount = 0;
    
    for (const user of nearbyUsers) {
      await ctx.db.insert("notifications", {
        advertisementId: args.advertisementId,
        recipientUserId: user._id,
        shopId: advertisement.shopId,
        message: advertisement.message,
        isRead: false,
        sentAt: Date.now(),
      });
      notificationCount++;
    }

    // Update advertisement with notification count
    await ctx.db.patch(args.advertisementId, {
      notificationsSent: notificationCount,
      updatedAt: Date.now(),
    });

    return notificationCount;
  },
});

export const getNotificationsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get notifications where user is direct recipient
    const recipientNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", args.userId))
      .collect();

    const notificationSet = new Set(recipientNotifications.map(n => n._id.toString()));
    let mergedNotifications = [...recipientNotifications];

    // Check if user exists and is a shopkeeper
    const userDoc = await ctx.db.get(args.userId);
    if (userDoc?.role === "shopkeeper") {
      // Get all shops owned by the user
      const userShops = await ctx.db
        .query("shops")
        .withIndex("by_owner", (q) => q.eq("ownerUid", args.userId))
        .collect();

      // Get notifications for each shop
      for (const shop of userShops) {
        const shopNotifications = await ctx.db
          .query("notifications")
          .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
          .collect();
          
        // Only add notifications that haven't been added yet
        for (const notification of shopNotifications) {
          if (!notificationSet.has(notification._id.toString())) {
            notificationSet.add(notification._id.toString());
            mergedNotifications.push(notification);
          }
        }
      }
    }

    // Sort by sent time
    mergedNotifications.sort((a, b) => b.sentAt - a.sentAt);

    // Fetch related data for each notification
    return Promise.all(
      mergedNotifications.map(async (notification) => {
        const advertisement = await ctx.db.get(notification.advertisementId);
        if (!advertisement) return { ...notification, advertisement: null };

        const shop = notification.shopId ? await ctx.db.get(notification.shopId) : null;
        
        return {
          ...notification,
          advertisement: {
            ...advertisement,
            shop,
          },
        };
      })
    );
  },
});

export const markNotificationAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
  },
});
