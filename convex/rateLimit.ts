import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * RATE LIMITING UTILITY
 * 
 * This module provides rate limiting functionality to prevent abuse of API endpoints.
 * It tracks attempts per key (email, IP, user ID) and enforces configurable limits.
 * 
 * Features:
 * - Configurable attempt limits and time windows
 * - Automatic cleanup of expired rate limit records
 * - Flexible key-based tracking (email, IP, user ID, etc.)
 */

// Check if rate limit is exceeded
export const checkRateLimit = mutation({
  args: {
    key: v.string(),
    maxAttempts: v.number(),
    windowMs: v.number(), // Time window in milliseconds
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find existing rate limit record
    const existingRecord = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    // If no record exists or it's expired, create new one
    if (!existingRecord || existingRecord.expiresAt < now) {
      // Delete old record if exists
      if (existingRecord) {
        await ctx.db.delete(existingRecord._id);
      }
      
      // Create new record
      await ctx.db.insert("rateLimits", {
        key: args.key,
        attempts: 1,
        expiresAt: now + args.windowMs,
        lastAttempt: now,
      });
      
      return {
        allowed: true,
        remaining: args.maxAttempts - 1,
        resetAt: now + args.windowMs,
      };
    }

    // Check if max attempts exceeded
    if (existingRecord.attempts >= args.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existingRecord.expiresAt,
        retryAfterMs: existingRecord.expiresAt - now,
      };
    }

    // Increment attempts
    await ctx.db.patch(existingRecord._id, {
      attempts: existingRecord.attempts + 1,
      lastAttempt: now,
    });

    return {
      allowed: true,
      remaining: args.maxAttempts - (existingRecord.attempts + 1),
      resetAt: existingRecord.expiresAt,
    };
  },
});

// Reset rate limit for a specific key
export const resetRateLimit = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (record) {
      await ctx.db.delete(record._id);
    }

    return { success: true };
  },
});

// Clean up expired rate limit records (called by cron job)
export const cleanupExpiredRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredRecords = await ctx.db
      .query("rateLimits")
      .withIndex("by_expiration", (q) => q.lt("expiresAt", now))
      .collect();

    for (const record of expiredRecords) {
      await ctx.db.delete(record._id);
    }

    console.log(`🧹 Cleaned up ${expiredRecords.length} expired rate limit records`);
    return { deletedCount: expiredRecords.length };
  },
});

// Get current rate limit status for a key
export const getRateLimitStatus = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!record || record.expiresAt < now) {
      return {
        exists: false,
        attempts: 0,
        remaining: null,
        resetAt: null,
      };
    }

    return {
      exists: true,
      attempts: record.attempts,
      resetAt: record.expiresAt,
      lastAttempt: record.lastAttempt,
    };
  },
});
