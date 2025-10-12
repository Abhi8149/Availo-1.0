import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * SCHEDULED JOBS FOR MAINTENANCE
 * 
 * This file defines cron jobs that run periodically to maintain database health.
 * Jobs include:
 * - Cleaning up expired verification codes
 * - Cleaning up expired password reset codes
 * - Cleaning up expired rate limits
 * 
 * NOTE: These cron jobs will work after deploying to Convex.
 * The cleanup functions are marked as 'internalMutation' in their respective files.
 */

const crons = cronJobs();

// Clean up expired verification codes every hour
crons.interval(
  "cleanup verification codes",
  { hours: 1 },
  internal.auth.cleanupExpiredCodes
);

// Clean up expired password reset codes every hour
crons.interval(
  "cleanup password reset codes",
  { hours: 1 },
  internal.verifyEmail.cleanupExpiredCodes
);

// Clean up expired rate limits every 6 hours
crons.interval(
  "cleanup rate limits",
  { hours: 6 },
  internal.rateLimit.cleanupExpiredRateLimits
);

export default crons;
