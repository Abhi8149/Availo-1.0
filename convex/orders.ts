import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Create a new order when customer books items
export const createOrder = mutation({
  args: {
    shopId: v.id("shops"),
    customerId: v.id("users"),
    items: v.array(v.object({
      itemId: v.id("items"),
      name: v.string(), // Changed from itemName to name
      quantity: v.number(),
      price: v.optional(v.number()),
      priceDescription: v.optional(v.string()),
    })),
    totalAmount: v.number(), // Changed from optional to required
    orderType: v.optional(v.union(v.literal("pickup"), v.literal("delivery"))),
    deliveryAddress: v.optional(v.object({
      address: v.string(),
      lat: v.number(),
      lng: v.number(),
    })),
    customerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      shopId: args.shopId,
      customerId: args.customerId,
      items: args.items,
      totalAmount: args.totalAmount,
      status: "pending",
      orderType: args.orderType || "pickup", // Use provided or default to pickup
      deliveryAddress: args.deliveryAddress,
      customerNotes: args.customerNotes,
      placedAt: Date.now(),
      createdAt: Date.now(),
    });

    return orderId;
  },
});

// Get orders for a specific shop
export const getShopOrders = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();
    
    // Enhance orders with customer information
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        return {
          ...order,
          customerName: customer?.name || "Unknown Customer",
          customerMobile: customer?.phone || null,
        };
      })
    );
    
    return enhancedOrders;
  },
});

// Get order history (completed and rejected orders) for a specific shop
export const getShopOrderHistory = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.or(q.eq(q.field("status"), "completed"), q.eq(q.field("status"), "rejected")))
      .order("desc")
      .collect();
  },
});

// Get order history for all shops owned by a user
export const getUserOrderHistory = query({
  args: { ownerUid: v.id("users") },
  handler: async (ctx, args) => {
    // First get all shops owned by the user
    const shops = await ctx.db
      .query("shops")
      .withIndex("by_owner", (q) => q.eq("ownerUid", args.ownerUid))
      .collect();
    
    // Get order history for all shops
    const allOrders = [];
    for (const shop of shops) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_shop", (q) => q.eq("shopId", shop._id))
        .filter((q) => q.or(
          q.eq(q.field("status"), "completed"), 
          q.eq(q.field("status"), "rejected"),
          q.eq(q.field("status"), "cancelled")
        ))
        .collect();
      
      // Add shop name to each order for reference
      const ordersWithShopName = orders.map(order => ({
        ...order,
        shopName: shop.name
      }));
      
      allOrders.push(...ordersWithShopName);
    }
    
    // Sort all orders by creation date (newest first)
    return allOrders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get pending orders count for a shop
export const getPendingOrdersCount = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_shop", (q) => q.eq("shopId", args.shopId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return orders.length;
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"), 
      v.literal("confirmed"), 
      v.literal("preparing"), 
      v.literal("ready"), 
      v.literal("completed"), 
      v.literal("rejected"), 
      v.literal("cancelled")
    ),
    deliveryTime: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.deliveryTime !== undefined) {
      updateData.deliveryTime = args.deliveryTime;
    }

    if (args.rejectionReason !== undefined) {
      updateData.rejectionReason = args.rejectionReason;
    }

    await ctx.db.patch(args.orderId, updateData);
  },
});

// Get orders for a customer
export const getCustomerOrders = query({
  args: { customerId: v.id("users") },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .collect();
    
    // Enhance orders with shop information
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        const shop = await ctx.db.get(order.shopId);
        return {
          ...order,
          shopName: shop?.name || "Unknown Shop",
        };
      })
    );
    
    return enhancedOrders;
  },
});

// Cancel order by customer
export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

// Send push notification to shopkeeper when new order is received
export const sendOrderNotificationToShopkeeper = action({
  args: {
    orderId: v.id("orders"),
    shopId: v.id("shops"),
    customerId: v.id("users"),
    items: v.array(v.object({
      itemId: v.id("items"),
      name: v.string(),
      quantity: v.number(),
      price: v.optional(v.number()),
      priceDescription: v.optional(v.string()),
    })),
    totalAmount: v.number(),
    orderType: v.union(v.literal("pickup"), v.literal("delivery")),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sentCount?: number;
    oneSignalId?: string;
    shopkeeperName?: string;
    customerName?: string;
    error?: string;
    reason?: string;
  }> => {
    try {
      console.log('🛒 Sending order notification for order:', args.orderId);

      // Get shop details
      const shop = await ctx.runQuery(api.shops.getShopById, { shopId: args.shopId });
      if (!shop) {
        throw new Error("Shop not found");
      }

      // Get shopkeeper details
      const shopkeeper = await ctx.runQuery(api.users.getUser, { userId: shop.ownerUid });
      if (!shopkeeper) {
        throw new Error("Shopkeeper not found");
      }

      // Get customer details
      const customer = await ctx.runQuery(api.users.getUser, { userId: args.customerId });
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Check if shopkeeper has OneSignal player ID and notifications enabled
      if (!shopkeeper.oneSignalPlayerId || shopkeeper.pushNotificationsEnabled === false) {
        console.log('⚠️ Shopkeeper has no OneSignal player ID or notifications disabled:', shopkeeper.name);
        return { success: false, reason: "Shopkeeper notifications not enabled" };
      }

      // Format item list for the notification
      const itemsList = args.items.map(item => 
        `• ${item.name} x${item.quantity}${item.price ? ` (₹${item.price})` : ''}`
      ).join('\n');

      // Create notification message
      const customerName: string = customer.name || "A customer";
      const shopName = shop.name;
      const orderTypeText = args.orderType === "delivery" ? "Delivery" : "Pickup";
      
      const notificationTitle = `🛒 New Order Received!`;
      const notificationMessage: string = `${customerName} placed a ${orderTypeText.toLowerCase()} order at ${shopName}\n\nItems:\n${itemsList}\n\nTotal: ₹${args.totalAmount}`;

      // Get OneSignal configuration from environment
      const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
      const oneSignalRestApiKey = process.env.ONESIGNAL_REST_API_KEY;

      if (!oneSignalAppId || !oneSignalRestApiKey) {
        console.error('❌ OneSignal configuration missing');
        throw new Error("OneSignal configuration not found");
      }

      // Create OneSignal notification payload
      const notificationPayload: any = {
        app_id: oneSignalAppId,
        target_channel: "push",
        priority: 10,
        ttl: 3600, // 1 hour TTL for order notifications
        
        // Target the specific shopkeeper
        include_aliases: {
          onesignal_id: [shopkeeper.oneSignalPlayerId]
        },
        
        // Notification content
        headings: {
          en: notificationTitle
        },
        contents: {
          en: notificationMessage
        },
        
        // Android specific
        android_group: "order_notifications",
        android_group_message: {
          en: "$[notif_count] new orders"
        },
        android_led_color: "FF00FF00", // Green LED for new orders
        android_sound: "notification_sound",
        android_visibility: 1, // Public visibility
        
        // Custom data for app handling
        data: {
          type: "new_order",
          orderId: args.orderId,
          shopId: args.shopId,
          customerId: args.customerId,
          totalAmount: args.totalAmount.toString(),
          orderType: args.orderType,
          deepLink: `goshop://order/${args.orderId}`
        },
      };

      console.log('📤 Sending order notification to shopkeeper:', shopkeeper.name);
      console.log('📋 Notification payload:', JSON.stringify(notificationPayload, null, 2));

      // Send push notification using OneSignal REST API
      const response: Response = await fetch("https://api.onesignal.com/notifications?c=push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key ${oneSignalRestApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      console.log('📨 OneSignal Response Status:', response.status);

      const result: any = await response.json();
      console.log('📨 OneSignal Response:', JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error('❌ OneSignal API Error:', result);
        throw new Error(`OneSignal API error (${response.status}): ${result.errors?.[0] || "Unknown error"}`);
      }

      if (result.errors && result.errors.length > 0) {
        console.error('❌ OneSignal returned errors:', result.errors);
        throw new Error(`OneSignal errors: ${result.errors.join(', ')}`);
      }

      console.log(`✅ Order notification sent successfully! Recipients: ${result.recipients}, Notification ID: ${result.id}`);

      return {
        success: true,
        sentCount: result.recipients || 0,
        oneSignalId: result.id,
        shopkeeperName: shopkeeper.name,
        customerName: customer.name,
      };

    } catch (error: unknown) {
      console.error("❌ Error sending order notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        sentCount: 0,
      };
    }
  },
});
