import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photoUri: v.optional(v.string()),
    password: v.optional(v.string()), // Optional for OAuth users
    clerkUserId: v.optional(v.string()), // Clerk user ID for OAuth
    role: v.union(v.literal("shopkeeper"), v.literal("customer")),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Location and OneSignal fields
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
      lastUpdated: v.number(),
    })),
    oneSignalPlayerId: v.optional(v.string()),
    pushNotificationsEnabled: v.optional(v.boolean()),
    // Legacy fields for backward compatibility
    fcmToken: v.optional(v.string()),
    pushToken: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_creation", ["createdAt"])
    .index("by_onesignal", ["oneSignalPlayerId"]),

  shops: defineTable({
    ownerUid: v.id("users"),
    name: v.string(),
    category: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.optional(v.string()),
    }),
    isOpen: v.boolean(),
    lastUpdated: v.number(),
    createdAt: v.number(),
    // New fields
    mobileNumber: v.optional(v.string()),
    shopImageId: v.optional(v.string()),  // Keep for backward compatibility
    shopImageIds: v.optional(v.array(v.string())), // Multiple images
    estimatedTime: v.optional(v.object({
      hours: v.number(),
      minutes: v.number(),
      action: v.union(v.literal("opening"), v.literal("closing")), // "opening" if closed, "closing" if open
    })),
    businessHours: v.optional(v.object({
      openTime: v.string(), // Format: "09:00"
      closeTime: v.string(), // Format: "18:00"
    })),
    hasDelivery: v.optional(v.boolean()),
    deliveryRange: v.optional(v.number()), // in kilometers
    // Verification fields
    isVerified: v.optional(v.boolean()), // Verification status - can be toggled from database
    verifiedAt: v.optional(v.number()), // Timestamp when verified
  })
    .index("by_owner", ["ownerUid"])
    .index("by_category", ["category"])
    .index("by_status", ["isOpen"])
    .index("by_verification", ["isVerified"])
    .index("by_creation", ["createdAt"])
    .index("by_category_status", ["category", "isOpen"])
    .index("by_owner_status", ["ownerUid", "isOpen"]),

  items: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    imageId: v.optional(v.string()),
    imageIds: v.optional(v.array(v.string())),
    inStock: v.boolean(),
    offer: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_shop_and_stock", ["shopId", "inStock"])
    .index("by_name", ["name"])
    .index("by_barcode", ["barcode"])
    .index("by_category", ["category"])
    .index("by_creation", ["createdAt"])
    .index("by_shop_category", ["shopId", "category"]),

  advertisements: defineTable({
    shopId: v.id("shops"),
    shopOwnerId: v.id("users"),
    message: v.string(),
    imageIds: v.optional(v.array(v.string())),
    videoIds: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    notificationsSent: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    hasDiscount: v.optional(v.boolean()),
    discountPercentage: v.optional(v.number()),
    discountText: v.optional(v.string()),
  })
    .index("by_shop", ["shopId"])
    .index("by_owner", ["shopOwnerId"])
    .index("by_active", ["isActive"]),

  notifications: defineTable({
    advertisementId: v.id("advertisements"),
    recipientUserId: v.id("users"),
    shopId: v.id("shops"),
    message: v.string(),
    isRead: v.boolean(),
    sentAt: v.number(),
  })
    .index("by_recipient", ["recipientUserId"])
    .index("by_advertisement", ["advertisementId"])
    .index("by_shop", ["shopId"])
    .index("by_advertisement_recipient", ["advertisementId", "recipientUserId"]),

  orders: defineTable({
    shopId: v.id("shops"),
    customerId: v.id("users"),
    items: v.array(v.object({
      itemId: v.id("items"),
      name: v.string(),
      price: v.optional(v.number()),
      quantity: v.number(),
      priceDescription: v.optional(v.string()),
    })),
    totalAmount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("rejected")
    ),
    orderType: v.union(v.literal("pickup"), v.literal("delivery")),
    deliveryAddress: v.optional(v.object({
      address: v.string(),
      lat: v.number(),
      lng: v.number(),
    })),
    customerNotes: v.optional(v.string()),
    deliveryTime: v.optional(v.number()), // Delivery time in minutes
    rejectionReason: v.optional(v.string()), // Reason for rejection
    estimatedReadyTime: v.optional(v.number()),
    placedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_shop", ["shopId"])
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"])
    .index("by_shop_status", ["shopId", "status"])
    .index("by_customer_status", ["customerId", "status"])
    .index("by_creation", ["createdAt"])
    .index("by_placed_at", ["placedAt"]),

  verificationCodes: defineTable({
    userId: v.string(),
    code: v.string(),
    email: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  passwordResetCodes: defineTable({
    email: v.string(),
    code: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    used: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_email_code", ["email", "code"])
    .index("by_expiration", ["expiresAt"]),
  
  // Rate limiting table for authentication and email operations
  rateLimits: defineTable({
    key: v.string(), // e.g., "email:user@example.com" or "ip:192.168.1.1"
    attempts: v.number(),
    expiresAt: v.number(),
    lastAttempt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiration", ["expiresAt"]),
});
