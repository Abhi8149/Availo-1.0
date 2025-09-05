import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
