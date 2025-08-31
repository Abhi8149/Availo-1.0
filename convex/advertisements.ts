import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createAdvertisement = mutation({
  args: {
    shopId: v.id("shops"),
    shopOwnerId: v.id("users"),
    message: v.string(),
    imageIds: v.optional(v.array(v.id("_storage"))),
    videoIds: v.optional(v.array(v.id("_storage"))),
    hasDiscount: v.optional(v.boolean()),
    discountPercentage: v.optional(v.number()),
    discountText: v.optional(v.string()),
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
      hasDiscount: args.hasDiscount,
      discountPercentage: args.discountPercentage,
      discountText: args.discountText,
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
    hasDiscount: v.optional(v.boolean()),
    discountPercentage: v.optional(v.number()),
    discountText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.message !== undefined) updates.message = args.message;
    if (args.imageIds !== undefined) updates.imageIds = args.imageIds;
    if (args.videoIds !== undefined) updates.videoIds = args.videoIds;
    if (args.hasDiscount !== undefined) updates.hasDiscount = args.hasDiscount;
    if (args.discountPercentage !== undefined) updates.discountPercentage = args.discountPercentage;
    if (args.discountText !== undefined) updates.discountText = args.discountText;

    await ctx.db.patch(args.advertisementId, updates);
  },
});

export const deleteAdvertisement = mutation({
  args: { advertisementId: v.id("advertisements") },
  handler: async (ctx, args) => {
    // First, delete all notifications related to this advertisement
    const relatedNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_advertisement", (q) => q.eq("advertisementId", args.advertisementId))
      .collect();
    
    // Delete all related notifications
    for (const notification of relatedNotifications) {
      await ctx.db.delete(notification._id);
    }
    
    // Then delete the advertisement itself
    await ctx.db.delete(args.advertisementId);
    
    return { 
      success: true, 
      deletedNotifications: relatedNotifications.length 
    };
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
    
    // Send notifications to ALL users (both customers and shopkeepers)
    // Shopkeepers can view advertisements when in customer mode
    const nearbyUsers = users;

    let notificationCount = 0;
    let skippedCount = 0;
    
    for (const user of nearbyUsers) {
      // Check if this specific user already has a notification for this advertisement
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_advertisement_recipient", (q) => 
          q.eq("advertisementId", args.advertisementId).eq("recipientUserId", user._id)
        )
        .first();
      
      if (existingNotification) {
        skippedCount++;
        continue; // Skip this user, they already have this notification
      }

      // Create notification for this user
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

    return {
      sent: notificationCount,
      skipped: skippedCount,
      total: notificationCount + skippedCount
    };
  },
});

export const getNotificationsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all notifications where user is direct recipient
    // This will include all advertisements sent to customers (including shopkeepers in customer mode)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientUserId", args.userId))
      .collect();

    // Sort by sent time (newest first)
    notifications.sort((a, b) => b.sentAt - a.sentAt);

    // Fetch related data for each notification
    return Promise.all(
      notifications.map(async (notification) => {
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

// Utility function to clean up notifications for shopkeepers viewing their own ads
export const cleanupShopkeeperSelfNotifications = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Get all notifications
    const allNotifications = await ctx.db.query("notifications").collect();
    
    let deletedCount = 0;
    
    // Check each notification to see if the recipient is the same as the advertisement creator
    for (const notification of allNotifications) {
      const advertisement = await ctx.db.get(notification.advertisementId);
      
      if (advertisement && advertisement.shopOwnerId === notification.recipientUserId) {
        // This is a shopkeeper receiving notification for their own advertisement
        await ctx.db.delete(notification._id);
        deletedCount++;
      }
    }
    
    return { deletedCount };
  },
});

// Utility function to clean up duplicate notifications
export const cleanupDuplicateNotifications = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Get all notifications
    const allNotifications = await ctx.db.query("notifications").collect();
    
    // Group by advertisementId + recipientUserId combination
    const notificationGroups = new Map<string, any[]>();
    
    for (const notification of allNotifications) {
      const key = `${notification.advertisementId}_${notification.recipientUserId}`;
      if (!notificationGroups.has(key)) {
        notificationGroups.set(key, []);
      }
      notificationGroups.get(key)!.push(notification);
    }
    
    let deletedCount = 0;
    
    // For each group, keep only the earliest notification and delete the rest
    for (const [key, notifications] of notificationGroups) {
      if (notifications.length > 1) {
        // Sort by sentAt time, keep the earliest
        notifications.sort((a, b) => a.sentAt - b.sentAt);
        const toKeep = notifications[0];
        const toDelete = notifications.slice(1);
        
        // Delete duplicates
        for (const duplicate of toDelete) {
          await ctx.db.delete(duplicate._id);
          deletedCount++;
        }
      }
    }
    
    return { deletedCount };
  },
});

// Utility function to fix shopkeeper self-notifications for existing advertisements
export const fixShopkeeperSelfNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all advertisements
    const advertisements = await ctx.db.query("advertisements").collect();
    
    let notificationsCreated = 0;
    
    for (const advertisement of advertisements) {
      // Get the shopkeeper who created this advertisement
      const shopkeeper = await ctx.db.get(advertisement.shopOwnerId);
      
      // Check if shopkeeper has customer role or dual role
      if (shopkeeper && shopkeeper.role === "customer") {
        // Check if notification already exists
        const existingNotification = await ctx.db
          .query("notifications")
          .withIndex("by_advertisement_recipient", (q) => 
            q.eq("advertisementId", advertisement._id).eq("recipientUserId", shopkeeper._id)
          )
          .first();
        
        if (!existingNotification) {
          // Create notification for shopkeeper to see their own advertisement
          await ctx.db.insert("notifications", {
            advertisementId: advertisement._id,
            recipientUserId: shopkeeper._id,
            shopId: advertisement.shopId,
            message: "New advertisement from your shop",
            isRead: false,
            sentAt: Date.now(),
          });
          notificationsCreated++;
        }
      }
    }
    
    return { notificationsCreated };
  },
});

// Utility function to ensure all users see all advertisements
export const ensureAllUsersHaveAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all advertisements
    const advertisements = await ctx.db.query("advertisements").collect();
    
    // Get ALL users (both customers and shopkeepers)
    const allUsers = await ctx.db.query("users").collect();
    
    let notificationsCreated = 0;
    
    for (const advertisement of advertisements) {
      for (const user of allUsers) {
        // Check if notification already exists
        const existingNotification = await ctx.db
          .query("notifications")
          .withIndex("by_advertisement_recipient", (q) => 
            q.eq("advertisementId", advertisement._id).eq("recipientUserId", user._id)
          )
          .first();
        
        if (!existingNotification) {
          // Create notification for this user
          await ctx.db.insert("notifications", {
            advertisementId: advertisement._id,
            recipientUserId: user._id,
            shopId: advertisement.shopId,
            message: "New advertisement available",
            isRead: false,
            sentAt: advertisement.createdAt || Date.now(),
          });
          notificationsCreated++;
        }
      }
    }
    
    return { notificationsCreated };
  },
});
