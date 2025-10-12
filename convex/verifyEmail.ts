import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * PASSWORD RESET WITH RATE LIMITING
 * 
 * This module handles password reset functionality with rate limiting.
 * Rate limits: 3 attempts per hour per email address.
 */

// Action to send password reset email
export const sendPasswordResetEmail = action({
  args: { 
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{ 
    success: boolean; 
    message: string; 
    remainingAttempts?: number;
  }> => {
    // Check rate limit (3 attempts per hour)
    const rateLimitKey = `password-reset:${args.email.toLowerCase()}`;
    
    // Check if rate limit function exists (will be available after deployment)
    let rateLimit: {
      allowed: boolean;
      remaining?: number;
      resetAt?: number;
      retryAfterMs?: number;
    } = { allowed: true };

    try {
      // @ts-ignore - api.rateLimit will be available after convex deploy
      if (api.rateLimit?.checkRateLimit) {
        // @ts-ignore
        rateLimit = await ctx.runMutation(api.rateLimit.checkRateLimit, {
          key: rateLimitKey,
          maxAttempts: 3,
          windowMs: 60 * 60 * 1000, // 1 hour
        });
      }
    } catch (error) {
      console.log('Rate limiting not yet deployed, skipping rate limit check');
    }

    if (!rateLimit.allowed) {
      const minutesLeft = Math.ceil((rateLimit.retryAfterMs || 0) / 60000);
      throw new Error(
        `Too many password reset attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      );
    }

    // Check if user exists
    const user = await ctx.runMutation(api.users.getUserByEmail, { email: args.email });
    
    if (!user) {
      throw new Error("This email address does not exist in our records. Please enter a correct email address.");
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the code in database
    await ctx.runMutation(api.verifyEmail.createPasswordResetCode, {
      email: args.email,
      code: code,
    });

    // Send email using external service
    try {
      const { sendVerificationEmail } = await import("../utils/emailService");
      await sendVerificationEmail(args.email, code);
      return { 
        success: true, 
        message: "Verification code sent to your email.",
        remainingAttempts: rateLimit.remaining,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send verification email. Please try again.");
    }
  },
});

// Store password reset verification codes
export const createPasswordResetCode = mutation({
  args: { 
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete any existing codes for this email
    const existingCodes = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();
    
    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Create new reset code (expires in 10 minutes)
    const resetCodeId = await ctx.db.insert("passwordResetCodes", {
      email: args.email,
      code: args.code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
    });

    return { success: true, resetCodeId };
  },
});

export const verifyPasswordResetCode = mutation({
  args: { 
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the reset code
    const resetCode = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => 
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("code"), args.code),
          q.eq(q.field("used"), false)
        )
      )
      .first();

    if (!resetCode) {
      throw new Error("Invalid verification code");
    }

    // Check if code has expired
    if (Date.now() > resetCode.expiresAt) {
      await ctx.db.delete(resetCode._id);
      throw new Error("Verification code has expired");
    }

    // Mark code as used
    await ctx.db.patch(resetCode._id, { used: true });

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return { success: true, userId: user._id };
  },
});

export const cleanupExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expiredCodes = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    console.log(`🧹 Cleaned up ${expiredCodes.length} expired password reset codes`);
    return { deletedCount: expiredCodes.length };
  },
});