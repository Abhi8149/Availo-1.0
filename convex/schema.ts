import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photoUri: v.optional(v.string()),
    password: v.optional(v.string()), // Optional for backward compatibility
    role: v.union(v.literal("shopkeeper"), v.literal("customer")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

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
    shopImageId: v.optional(v.id("_storage")), // Keep for backward compatibility
    shopImageIds: v.optional(v.array(v.id("_storage"))), // Multiple images
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
  })
    .index("by_owner", ["ownerUid"])
    .index("by_category", ["category"])
    .index("by_status", ["isOpen"]),

  items: defineTable({
    shopId: v.id("shops"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    priceDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    inStock: v.boolean(),
    offer: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shop", ["shopId"])
    .index("by_shop_and_stock", ["shopId", "inStock"])
    .index("by_name", ["name"]),

  advertisements: defineTable({
    shopId: v.id("shops"),
    shopOwnerId: v.id("users"),
    message: v.string(),
    imageIds: v.optional(v.array(v.id("_storage"))),
    videoIds: v.optional(v.array(v.id("_storage"))),
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
    .index("by_email_code", ["email", "code"]),
});
