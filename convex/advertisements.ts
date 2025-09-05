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
//function to check which one is sbubsribed and which one is not
// Add this new action to your advertisements.ts file
export const checkPlayerSubscription = action({
  args: {
    playerId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    isSubscribed: boolean;
    isValid: boolean;
    notificationTypes: number;
    error?: string;
  }> => {
    try {
      // Use correct environment variable names
      const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
      const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

      if (!oneSignalAppId || !oneSignalRestApiKey) {
        throw new Error("OneSignal credentials not configured");
      }
      console.log(`🔍 Checking subscription for player: ${args.playerId}`);
      const app_id=oneSignalAppId
      // Check player subscription status using OneSignal API
      const alias_id=args.playerId
      const response = await fetch(`https://api.onesignal.com/apps/${app_id}/users/by/onesignal_id/${alias_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Key ${oneSignalRestApiKey}`,
        },
      });
       
      if (!response.ok) {
        console.error(`❌ OneSignal API error for player ${args.playerId}: ${response.status}`);
       const playerData = await response.json();
      console.log(`📱 Player data for ${args.playerId}:`, JSON.stringify(playerData, null, 2));
        return {
          isSubscribed: false,
          isValid: false,
          notificationTypes: 0,
          error: `API error: ${response.status}`,
        };
      }

      const playerData = await response.json();
      console.log(`📱 Player data for ${args.playerId}:`, JSON.stringify(playerData, null, 2));

      // Check if player is subscribed and valid
      /*
      {
  "properties": {
    "language": "en",
    "timezone_id": "Asia/Kolkata",
    "country": "IN",
    "first_active": 1757094919,
    "last_active": 1757096329,
    "ip": "2401:4900:a184:e56e:4bb:28ff:fe64:df36"
  },
  "identity": {
    "onesignal_id": "130c2f67-3b55-4582-b867-02176fe763eb"
  },
  "subscriptions": [
    {
      "id": "5d6fff55-468c-4e6f-bfa3-5df8dd06fbc4",
      "app_id": "3de46348-ec6d-4e68-8a4c-81536e45c73c",
      "type": "AndroidPush",
      "token": "fH5mDx16TF2_jzjS4XCGFM:APA91bG5sGAdUctOTdbBLHc4-P5tN5enGg1l1dwnOrDC8ucQg20_E_GPAHYsnrkSPHfLvGx_nkXkqJSXlS55Z6WB1UtLPV-28vyuGnDpv-aA5oVZbFv78eY",
      "enabled": true,
      "notification_types": 1,
      "session_time": 10,
      "session_count": 4,
      "sdk": "050135",
      "device_model": "CPH2467",
      "device_os": "15",
      "rooted": false,
      "test_type": 0,
      "app_version": "1",
      "net_type": 1,
      "carrier": "airtel",
      "web_auth": "",
      "web_p256": ""
    }
  ]
}
      */ 
     console.log('Notification status:',playerData.subscriptions[0].enabled)
     console.log('Notification_type status:',playerData.subscriptions[0].notification_types)
      const isValid = playerData.subscriptions[0].enabled;
      const notificationTypes = playerData.subscriptions[0].notification_types;
      const isSubscribed = isValid && notificationTypes > 0;

      // console.log(`✅ Player ${args.playerId}: valid=${isValid}, notificationTypes=${notificationTypes}, subscribed=${isSubscribed}`);

      return {
        isSubscribed,
        isValid,
        notificationTypes,
      };

    } catch (error) {
      console.error(`❌ Error checking player subscription ${args.playerId}:`, error);
      return {
        isSubscribed: false,
        isValid: false,
        notificationTypes: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
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
// Update your sendPushNotificationToNearbyUsers action
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
    subscribedUsersCount?: number;
    error?: string;
  }> => {
    try {
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

      console.log(`📍 Found ${nearbyUsers.length} nearby users`);

      if (nearbyUsers.length === 0) {
        return {
          success: true,
          sentCount: 0,
          message: "No nearby users found",
        };
      }

      // Extract player IDs from nearby users who have notifications enabled
      const potentialPlayerIds: string[] = nearbyUsers
        .filter((user: any) => {
          const hasPlayerId = user.oneSignalPlayerId && user.oneSignalPlayerId.trim() !== '';
          const hasNotificationsEnabled = user.pushNotificationsEnabled !== false;
          console.log(`👤 User ${user.name}: playerId=${user.oneSignalPlayerId}, enabled=${hasNotificationsEnabled}`);
          return hasPlayerId && hasNotificationsEnabled;
        })
        .map((user: any) => user.oneSignalPlayerId);

      console.log(`🔔 Found ${potentialPlayerIds.length} users with player IDs:`, potentialPlayerIds);

      if (potentialPlayerIds.length === 0) {
        return {
          success: true,
          sentCount: 0,
          message: "No nearby users with push notifications enabled",
          nearbyUsersCount: nearbyUsers.length,
          enabledUsersCount: 0,
        };
      }

      // 🔍 NEW: Check subscription status for each player ID
      const subscribedPlayerIds: string[] = [];
      
      for (const playerId of potentialPlayerIds) {
        const subscriptionCheck = await ctx.runAction(api.advertisements.checkPlayerSubscription, {
          playerId,
        });
        
        if (subscriptionCheck.isSubscribed) {
          subscribedPlayerIds.push(playerId);
          console.log(`✅ Player ${playerId} is subscribed`);
        } else {
          console.log(`❌ Player ${playerId} is NOT subscribed: valid=${subscriptionCheck.isValid}, notificationTypes=${subscriptionCheck.notificationTypes}`);
        }
      }

      console.log(`📱 Found ${subscribedPlayerIds.length} actually subscribed users out of ${potentialPlayerIds.length}`);

      if (subscribedPlayerIds.length === 0) {
        return {
          success: false,
          error: "No users are actually subscribed to notifications. All player IDs are invalid or unsubscribed.",
          sentCount: 0,
          nearbyUsersCount: nearbyUsers.length,
          enabledUsersCount: potentialPlayerIds.length,
          subscribedUsersCount: 0,
        };
      }

      // Use correct environment variable names
      const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
      const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

      console.log('🔑 OneSignal App ID:', oneSignalAppId);
      console.log('🔑 OneSignal REST API Key exists:', !!oneSignalRestApiKey);

      if (!oneSignalAppId || !oneSignalRestApiKey) {
        throw new Error("OneSignal credentials not configured");
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

      const notificationPayload = {
        app_id: oneSignalAppId,
        target_channel: "push",
        include_aliases: {
    "onesignal_id": subscribedPlayerIds
        },// 
        headings: { en: title },
        contents: { en: message },
        data: additionalData,
        android_accent_color: "FF9C27B0",
        small_icon: "ic_notification",
        large_icon: "ic_launcher",
      };

      console.log('📤 Sending OneSignal notification payload:', JSON.stringify(notificationPayload, null, 2));

      // Send push notification using OneSignal REST API
      //curl --request POST \
  /*
  --url 'https://api.onesignal.com/notifications?c=push' \
  --header 'Authorization: Key os_v2_app_hxsggshmnvhgrcsmqfjw4rohhsgvdry6avsusl4cr33zrac6wlucwielndg44z3oybxkkv5e3c3ijbdkht2zqbauvjx2p6u4cmxxkxq' \
  --header 'Content-Type: application/json' \
  --data '{
  "app_id": "3de46348-ec6d-4e68-8a4c-81536e45c73c",
  "target_channel": "push",
  "huawei_category": "MARKETING",
  "huawei_msg_type": "message",
  "priority": 10,
  "ios_interruption_level": "active",
  "ios_badgeType": "None",
  "ttl": 259200,
  "contents": {
    "en": "en"
  },
  "include_aliases": {
    "onesignal_id": [
      "130c2f67-3b55-4582-b867-02176fe763eb"
    ]
  },
  "headings": {
    "en": "Enjoy using my app"
  },
  "name": "Install my app shop status"
}'*/
      const response: Response = await fetch("https://api.onesignal.com/notifications?c=push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key ${oneSignalRestApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      console.log('📨 OneSignal Response Status:', response.status);
      console.log('📨 OneSignal Response OK:', response.ok);

      // Get the actual response data
      const result: any = await response.json();
      console.log('📨 OneSignal Response Body:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error('❌ OneSignal API Error:', result);
        throw new Error(`OneSignal API error (${response.status}): ${result.errors?.[0] || "Unknown error"}`);
      }

      // Check for errors in the response body
      if (result.errors && result.errors.length > 0) {
        console.error('❌ OneSignal returned errors:', result.errors);
        throw new Error(`OneSignal errors: ${result.errors.join(', ')}`);
      }

      console.log(`✅ OneSignal Success! Recipients: ${result.recipients}, Notification ID: ${result.id}`);

      // Update the advertisement with notification count
      await ctx.runMutation(api.advertisements.updateAdvertisement, {
        advertisementId: args.advertisementId,
        notificationsSent: (advertisement.notificationsSent || 0) + (result.recipients || 0),
      });

      return {
        success: true,
        sentCount: result.recipients || 0,
        oneSignalId: result.id,
        nearbyUsersCount: nearbyUsers.length,
        enabledUsersCount: potentialPlayerIds.length,
        subscribedUsersCount: subscribedPlayerIds.length,
      };

    } catch (error: unknown) {
      console.error("❌ Error sending push notification:", error);
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
