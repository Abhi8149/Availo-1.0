import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Action to send password reset email
export const sendPasswordResetEmail = action({
  args: { 
    email: v.string(),
  },
  handler: async (ctx, args) => {
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
      return { success: true, message: "Verification code sent to your email." };
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

export const cleanupExpiredCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const expiredCodes = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    return { deletedCount: expiredCodes.length };
  },
});