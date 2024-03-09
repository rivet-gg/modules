import { exists, tjs } from "../deps.ts";
import { crypto, encodeHex } from "./deps.ts";
import { BuildState } from "./mod.ts";

// TODO: Replace this with the OpenGB version instead since it means we'll change . We need to compile this in the build artifacts.
export const CACHE_VERSION = 4;

/**
 * Data from `BuildCache` that gets persisted.
 */
export interface BuildCache {
	version: number;
	fileHashes: Record<string, FileHash>;
	exprHashes: Record<string, string>;
	moduleConfigSchemas: Record<string, tjs.Definition>;
	scriptSchemas: Record<
		string,
		Record<string, { request: tjs.Definition; response: tjs.Definition }>
	>;
}

export interface CacheScriptSchema {
	request: tjs.Definition;
	response: tjs.Definition;
}

export type FileHash = { hash: string } | { missing: true };

export function createDefaultCache(): BuildCache {
	return {
		version: CACHE_VERSION,
		fileHashes: {},
		exprHashes: {},
		moduleConfigSchemas: {},
		scriptSchemas: {},
	};
}

/**
 * Checks if the hash of a file has changed. Returns true if file changed.
 */
export async function compareHash(
	buildState: BuildState,
	paths: string[],
): Promise<boolean> {
	// We hash all files regardless of if we already know there was a change so
	// we can re-use these hashes on the next run to see if anything changed.
	let hasChanged = false;
	for (const path of paths) {
		const oldHash = buildState.oldCache.fileHashes[path];
		const newHash = await hashFile(buildState, path);
		if (!oldHash) {
			hasChanged = true;
		} else if ("missing" in oldHash && "missing" in newHash) {
			hasChanged = oldHash.missing != newHash.missing;
		} else if ("hash" in oldHash && "hash" in newHash) {
			hasChanged = oldHash.hash != newHash.hash;
		} else {
			hasChanged = true;
		}

		if (hasChanged) console.log(`✏️ ${path}`);
	}

	return hasChanged;
}

export async function hashFile(
	buildState: BuildState,
	path: string,
): Promise<FileHash> {
	// Return already calculated hash
	let hash = buildState.cache.fileHashes[path];
	if (hash) return hash;

	if (await exists(path)) {
		// Calculate hash
		const file = await Deno.open(path, { read: true });
		const fileHashBuffer = await crypto.subtle.digest(
			"SHA-256",
			file.readable,
		);
		hash = { hash: encodeHex(fileHashBuffer) };
	} else {
		// Specify missing
		hash = { missing: true };
	}

	buildState.cache.fileHashes[path] = hash;
	return hash;
}

/**
 * Checks if the hash of an expression has changed. Returns true if expression changed.
 */
export async function compareExprHash(
	buildState: BuildState,
	exprs: Record<string, string>,
): Promise<boolean> {
	// We hash all files regardless of if we already know there was a change so
	// we can re-use these hashes on the next run to see if anything changed.
	let hasChanged = false;
	for (const [name, value] of Object.entries(exprs)) {
		const oldHash = buildState.oldCache.exprHashes[name];
		const newHash = await hashExpr(buildState, name, value);
		if (newHash != oldHash) {
			hasChanged = true;
			console.log(`✏️  ${name}`);
		}
	}

	return hasChanged;
}

export async function hashExpr(
	buildState: BuildState,
	name: string,
	value: any,
): Promise<string> {
	// Return already calculated hash
	let hash = buildState.cache.exprHashes[name];
	if (hash) return hash;

	// Calculate hash
	const exprHashBuffer = await crypto.subtle.digest(
		"SHA-256",
		await new Blob([value]).arrayBuffer(),
	);
	hash = encodeHex(exprHashBuffer);
	buildState.cache.exprHashes[name] = hash;

	return hash;
}
