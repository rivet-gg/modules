// See also packages/runtime/src/postgres.ts
export const DRIZZLE_ORM_VERSION = "0.33.0";
export const DRIZZLE_KIT_VERSION = "0.24.0";

export const DRIZZLE_ORM_PACKAGE = `npm:drizzle-orm@${DRIZZLE_ORM_VERSION}`;
export const DRIZZLE_KIT_PACKAGE = `npm:drizzle-kit@${DRIZZLE_KIT_VERSION}`;
export const PG_PACKAGE = "npm:pg@8.12.0";
export const NEON_PACKAGE = "npm:@neondatabase/serverless@0.9.3";

// Package names without the Deno namespaces. These are used when having Drizzle introspect the schema.
export const DRIZZLE_ORM_PACKAGE_NPM = "drizzle-orm";
export const DRIZZLE_KIT_PACKAGE_NPM = "drizzle-kit";
