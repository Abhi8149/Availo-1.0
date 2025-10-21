/**
 * PASSWORD HASHING UTILITIES
 * 
 * This module provides secure password hashing and verification using bcrypt.
 * 
 * Security Features:
 * - Bcrypt algorithm with salt rounds = 10
 * - One-way hashing (cannot be reversed)
 * - Salt is automatically generated and stored with hash
 * - Resistant to rainbow table attacks
 * - Resistant to brute force attacks
 */

import bcrypt from "bcryptjs";

/**
 * Hash a plain text password (SYNCHRONOUS for Convex compatibility)
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export function hashPassword(password: string): string {
  const saltRounds = 10; // Higher = more secure but slower (10 is recommended)
  // Use hashSync instead of hash to avoid setTimeout error in Convex
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
}

/**
 * Verify a plain text password against a hashed password (SYNCHRONOUS for Convex compatibility)
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password from database
 * @returns True if password matches, false otherwise
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  // Use compareSync instead of compare to avoid setTimeout error in Convex
  const isMatch = bcrypt.compareSync(password, hashedPassword);
  return isMatch;
}

/**
 * Check if a string is already hashed (bcrypt format)
 * Bcrypt hashes start with $2a$, $2b$, or $2y$
 * @param password - Password string to check
 * @returns True if already hashed, false if plain text
 */
export function isPasswordHashed(password: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(password);
}
