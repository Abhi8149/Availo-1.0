/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as advertisements from "../advertisements.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as emailConfig from "../emailConfig.js";
import type * as files from "../files.js";
import type * as items from "../items.js";
import type * as orders from "../orders.js";
import type * as passwordUtils from "../passwordUtils.js";
import type * as rateLimit from "../rateLimit.js";
import type * as shops from "../shops.js";
import type * as users from "../users.js";
import type * as verifyEmail from "../verifyEmail.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  advertisements: typeof advertisements;
  auth: typeof auth;
  crons: typeof crons;
  debug: typeof debug;
  emailConfig: typeof emailConfig;
  files: typeof files;
  items: typeof items;
  orders: typeof orders;
  passwordUtils: typeof passwordUtils;
  rateLimit: typeof rateLimit;
  shops: typeof shops;
  users: typeof users;
  verifyEmail: typeof verifyEmail;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
