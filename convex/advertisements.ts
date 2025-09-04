import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
    notificationsSent: v.optional(v.number()),
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
    if (args.notificationsSent !== undefined) updates.notificationsSent = args.notificationsSent;

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

// Send push notifications to nearby users when advertisement is created
export const sendPushNotificationToNearbyUsers = action({
  args: {
    advertisementId: v.id("advertisements"),
    shopId: v.id("shops"),
    shopLat: v.number(),
    shopLng: v.number(),
    radiusKm: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sentCount: number;
    message?: string;
    oneSignalId?: string;
    nearbyUsersCount?: number;
    enabledUsersCount?: number;
    error?: string;
  }> => {
    // Get the advertisement details
    const advertisement = await ctx.runQuery(api.advertisements.getAdvertisementById, {
      advertisementId: args.advertisementId,
    });

    if (!advertisement) {
      throw new Error("Advertisement not found");
    }

    // Get the shop details
    const shop = await ctx.runQuery(api.shops.getShop, {
      shopId: args.shopId,
    });

    if (!shop) {
      throw new Error("Shop not found");
    }

    // Get nearby users within the radius
    const nearbyUsers = await ctx.runQuery(api.users.getNearbyUsers, {
      shopLat: args.shopLat,
      shopLng: args.shopLng,
      radiusKm: args.radiusKm,
    });
    console.log('Nearby users are',nearbyUsers)

    console.log('📍 Initial nearby users found:', nearbyUsers.length);

    if (nearbyUsers.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: "No nearby users found",
        nearbyUsersCount: 0,
        enabledUsersCount: 0,
      };
    }

    // Filter users who have valid OneSignal IDs and notifications enabled
    const eligibleUsers = nearbyUsers.filter((user: any) => {
      const hasValidOneSignalId = user.oneSignalPlayerId && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.oneSignalPlayerId);
      
      const hasNotificationsEnabled = user.pushNotificationsEnabled === true;
      
      const isCustomer = user.role;
      
      const isEligible = hasValidOneSignalId && hasNotificationsEnabled && isCustomer;
      
      console.log(`👤 User ${user.name} (${user._id}):`, {
        hasValidOneSignalId,
        hasNotificationsEnabled,
        isCustomer,
        isEligible,
        playerId: user.oneSignalPlayerId ? user.oneSignalPlayerId.substring(0, 8) + '...' : 'NONE'
      });
      console.log('All those peoples who are eligible',isEligible)
      return isEligible;
    });

    console.log('✅ Eligible users for push notification:', {
      totalNearby: nearbyUsers.length,
      eligible: eligibleUsers.length,
      filtered: nearbyUsers.length - eligibleUsers.length
    });

    if (eligibleUsers.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: "No eligible users found (need valid OneSignal ID, notifications enabled, and customer role)",
        nearbyUsersCount: nearbyUsers.length,
        enabledUsersCount: 0,
      };
    }

    // Prepare notification data
    const title: string = `🛍️ Special Offer at ${shop.name}!`;
    const message: string = advertisement.message.length > 100 
      ? advertisement.message.substring(0, 100) + "..." 
      : advertisement.message;
    
    const additionalData = {
      type: "advertisement",
      advertisementId: advertisement._id,
      shopId: shop._id,
      shopName: shop.name,
      hasDiscount: advertisement.hasDiscount,
      discountPercentage: advertisement.discountPercentage,
      discountText: advertisement.discountText,
    };

    // Extract player IDs from eligible users (already validated)
    const playerIds: string[] = eligibleUsers.map((user: any) => user.oneSignalPlayerId);

    console.log('🎯 Final player IDs for notification:', {
      eligibleUsers: eligibleUsers.length,
      playerIds: playerIds.length,
      playerIdsList: playerIds
    });

    if (playerIds.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: "No valid OneSignal player IDs found from eligible users",
        nearbyUsersCount: nearbyUsers.length,
        enabledUsersCount: 0,
      };
    }

    // Send push notification using OneSignal REST API
    try {
      const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
      const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

      console.log('🔐 OneSignal Config Check:', {
        hasAppId: !!oneSignalAppId,
        appIdPreview: oneSignalAppId ? oneSignalAppId.substring(0, 8) + '...' : 'MISSING',
        hasRestApiKey: !!oneSignalRestApiKey,
        restApiKeyPreview: oneSignalRestApiKey ? oneSignalRestApiKey.substring(0, 10) + '...' : 'MISSING',
        playerIdsCount: playerIds.length,
        playerIds: playerIds
      });

      if (!oneSignalAppId || !oneSignalRestApiKey) {
        throw new Error("OneSignal credentials not configured in environment variables");
      }

      const notificationPayload = {
        app_id: oneSignalAppId,
        include_player_ids: playerIds,
        headings: { en: title },
        contents: { en: message },
        data: additionalData,
        android_accent_color: "FF9C27B0",
        small_icon: "ic_notification",
        large_icon: "ic_launcher",
      };

      console.log('📤 Sending OneSignal notification:', {
        app_id: oneSignalAppId,
        playerIds: playerIds,
        title: title,
        message: message
      });

      const response: Response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${oneSignalRestApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      const result: any = await response.json();

      console.log('📨 OneSignal Response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (!response.ok) {
        console.error('❌ OneSignal API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errors: result.errors,
          result: result
        });
        
        const errorMsg = result.errors?.[0] || result.error || "Unknown OneSignal API error";
        throw new Error(`OneSignal API error (${response.status}): ${errorMsg}`);
      }

      // Check for OneSignal specific errors even with 200 status
      if (result.errors && result.errors.length > 0) {
        console.error('⚠️ OneSignal returned errors with 200 status:', result.errors);
        
        // Handle common OneSignal errors
        if (result.errors.includes('All included players are not subscribed')) {
          console.log('🔍 OneSignal Error Analysis:');
          console.log('- This means all player IDs are invalid or users are not subscribed');
          console.log('- Check if users have granted notification permissions');
          console.log('- Verify OneSignal player IDs are correctly captured');
          console.log('- Player IDs sent:', playerIds);
          
          return {
            success: false,
            error: "All users are not subscribed to push notifications. Please ensure users have granted notification permissions and OneSignal is properly initialized.",
            sentCount: 0,
            nearbyUsersCount: nearbyUsers.length,
            enabledUsersCount: eligibleUsers.length,
          };
        }
        
        return {
          success: false,
          error: `OneSignal error: ${result.errors.join(', ')}`,
          sentCount: 0,
          nearbyUsersCount: nearbyUsers.length,
          enabledUsersCount: eligibleUsers.length,
        };
      }

      // Update the advertisement with notification count
      await ctx.runMutation(api.advertisements.updateAdvertisement, {
        advertisementId: args.advertisementId,
        message: advertisement.message,
        notificationsSent: (advertisement.notificationsSent || 0) + (result.recipients || playerIds.length),
      });

      return {
        success: true,
        sentCount: result.recipients || playerIds.length,
        oneSignalId: result.id,
        nearbyUsersCount: nearbyUsers.length,
        enabledUsersCount: eligibleUsers.length,
      };

    } catch (error: unknown) {
      console.error("Error sending push notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        sentCount: 0,
      };
    }
  },
});

// Get advertisement by ID
export const getAdvertisementById = query({
  args: { advertisementId: v.id("advertisements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.advertisementId);
  },
});
