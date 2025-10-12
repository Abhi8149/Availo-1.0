import { mutation, action, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { emailConfig, getSenderEmail, getRecipientEmail } from "./emailConfig";

/**
 * AUTHENTICATION WITH RATE LIMITING
 * 
 * This module handles email verification with built-in rate limiting to prevent abuse.
 * Rate limits: 3 attempts per hour per email address.
 */

// ACTION: Can make HTTP requests to external APIs
export const sendVerificationCode = action({
  args: { email: v.string(), userId: v.string() },
  handler: async (ctx, { email, userId }): Promise<{
    success: boolean;
    message: string;
    isTestMode: boolean;
    recipientEmail: string;
    remainingAttempts?: number;
  }> => {
    // Check rate limit (3 attempts per hour)
    const rateLimitKey = `verify:${email.toLowerCase()}`;
    
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
        `Too many verification attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      // Get email configuration based on domain verification status
      const { email: recipientEmail, isTestEmail, originalEmail } = getRecipientEmail(email);
      const senderEmail = getSenderEmail();
      
      // Prepare email content
      const emailSubject = emailConfig.templates.verification.subject;
      const emailHtml = emailConfig.templates.verification.getHtml(code, isTestEmail, originalEmail);
      
      // Send email using Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailConfig.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${emailConfig.resend.fromName} <${senderEmail}>`,
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Resend API error:', result);
        throw new Error(`Email send failed: ${result.message || 'Unknown error'}`);
      }

      console.log('Email sent successfully:', {
        to: recipientEmail,
        isTestMode: isTestEmail,
        originalEmail: isTestEmail ? originalEmail : 'same as recipient'
      });
      
      // Store the verification code
      await ctx.runMutation(api.auth.storeVerificationCode, { userId, code, email: originalEmail });
      
      // Return appropriate success message
      const successMessage = isTestEmail 
        ? `Verification code sent to ${recipientEmail} (test mode - original: ${originalEmail})`
        : 'Verification code sent successfully';
        
      return { 
        success: true, 
        message: successMessage,
        isTestMode: isTestEmail,
        recipientEmail: recipientEmail
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  },
});

// MUTATION: Store verification code in database
export const storeVerificationCode = mutation({
  args: { userId: v.string(), code: v.string(), email: v.string() },
  handler: async (ctx, { userId, code, email }) => {
    const now = Date.now();
    const expiresAt = now + (10 * 60 * 1000); // 10 minutes from now
    
    // Delete any existing verification code for this user
    const existing = await ctx.db
      .query("verificationCodes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    
    // Store the new verification code
    await ctx.db.insert("verificationCodes", {
      userId,
      code,
      email,
      expiresAt,
      createdAt: now,
    });
    
    return true;
  },
});

// MUTATION: Verify the code
export const verifyCode = mutation({
  args: { userId: v.string(), code: v.string() },
  handler: async (ctx, { userId, code }) => {
    const now = Date.now();
    
    // Find the verification code for this user
    const storedCode = await ctx.db
      .query("verificationCodes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    if (!storedCode) {
      return { success: false, message: "No verification code found. Please request a new one." };
    }
    
    // Check if code has expired
    if (now > storedCode.expiresAt) {
      await ctx.db.delete(storedCode._id);
      return { success: false, message: "Verification code has expired. Please request a new one." };
    }
    
    // Check if code matches
    if (storedCode.code === code) {
      // Delete the used code
      await ctx.db.delete(storedCode._id);
      return { success: true, message: "Email verified successfully!" };
    }
    
    return { success: false, message: "Invalid verification code. Please check and try again." };
  },
});

// INTERNAL MUTATION: Clean up expired verification codes (called by cron job)
export const cleanupExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredCodes = await ctx.db
      .query("verificationCodes")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();
    
    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }
    
    console.log(`🧹 Cleaned up ${expiredCodes.length} expired verification codes`);
    return { deleted: expiredCodes.length };
  },
});
