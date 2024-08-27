/**
 * These are types that get automatically exported in module.gen.ts.
 *
 * Any common helper types should go here.
 */

/**
 * Empty Request/Response type.
 *
 * This only exists because of some quirks of empty interfaces in
 * typescript that can be read more about here:
 * https://www.totaltypescript.com/the-empty-object-type-in-typescript
 */
export type Empty = Record<string, never>;

export { RuntimeError, UnreachableError } from "./error.ts";
export { ActorBase } from "./actor/actor.ts";

// MARK: Experimental
import { errorToLogEntries, getFormattedTimestamp, spreadObjectToLogEntries } from "./logger.ts";
export const __EXPERIMENTAL = {
	Log: { errorToLogEntries, spreadObjectToLogEntries, getFormattedTimestamp },
};
