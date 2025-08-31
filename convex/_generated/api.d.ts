/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as advertisements from "../advertisements.js";
import type * as auth from "../auth.js";
import type * as emailConfig from "../emailConfig.js";
import type * as files from "../files.js";
import type * as items from "../items.js";
import type * as shops from "../shops.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  advertisements: typeof advertisements;
  auth: typeof auth;
  emailConfig: typeof emailConfig;
  files: typeof files;
  items: typeof items;
  shops: typeof shops;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
