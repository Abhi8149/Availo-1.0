
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    photoUri: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.photoUri !== undefined) updates.photoUri = args.photoUri;
    if (args.password !== undefined) updates.password = args.password;
    await ctx.db.patch(args.userId, updates);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("shopkeeper"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const getUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});