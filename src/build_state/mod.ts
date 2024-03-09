import { exists, resolve } from "../deps.ts";
import { Module, Project, Script } from "../project/mod.ts";
import { BuildCache, CACHE_VERSION, compareExprHash, compareHash, createDefaultCache } from "./cache.ts";

// TODO: Convert this to a build flag
export const FORCE_BUILD = false;

/**
 * State for the current build process.
 */
export interface BuildState {
	project: Project;

	/**
	 * The old cache from the last build. This will be discarded.
	 */
	oldCache: BuildCache;

	/**
	 * The new cache that will be written to disk. This is a clone of
	 * `oldCache`.
	 */
	cache: BuildCache;

	promises: Promise<void>[];
}

export async function createBuildState(project: Project): Promise<BuildState> {
	const buildCachePath = resolve(project.path, "_gen", "cache.json");

	// Read hashes from file
	let oldCache: BuildCache;
	if (await exists(buildCachePath)) {
		const oldCacheAny: any = JSON.parse(await Deno.readTextFile(buildCachePath));

		// Validate version
		if (oldCacheAny.version == CACHE_VERSION) {
			oldCache = oldCacheAny;
		} else {
			oldCache = createDefaultCache();
		}
	} else {
		oldCache = createDefaultCache();
	}

	// Build state
	const buildState: BuildState = {
		project,
		oldCache,
		cache: structuredClone(oldCache),
		promises: [],
	};

	return buildState;
}

interface BuildStepOpts {
	name: string;
	module?: Module;
	script?: Script;
	build: () => Promise<void>;
	alreadyCached?: () => Promise<void>;
	finally?: () => Promise<void>;
	always?: boolean;
	files?: string[];
	expressions?: Record<string, any>;
}

/**
 * Plans a build step.
 */
export function buildStep(
	buildState: BuildState,
	opts: BuildStepOpts,
) {
	// Build step name
	let stepName = opts.name;
	if (opts.module && opts.script) {
		stepName += ` (${opts.module.name}.${opts.script.name})`;
	} else if (opts.module) {
		stepName += ` (${opts.module.name})`;
	}

	const fn = async () => {
		// These are not lazily evaluated one after the other because the hashes for both need to be calculated
		const fileDiff = opts.files && await compareHash(buildState, opts.files);
		const exprDiff = opts.expressions &&
			await compareExprHash(buildState, opts.expressions);

		// TODO: max parallel build steps
		// TODO: error handling
		if (
			FORCE_BUILD ||
			opts.always ||
			fileDiff ||
			exprDiff
		) {
			console.log(`🔨 ${stepName}`);
			await opts.build();
		} else {
			if (opts.alreadyCached) await opts.alreadyCached();
		}

		if (opts.finally) await opts.finally();
	};

	buildState.promises.push(fn());
}

export async function waitForBuildPromises(buildState: BuildState): Promise<void> {
	const promises = buildState.promises;
	buildState.promises = [];
	await Promise.all(promises);
}

export async function writeBuildState(buildState: BuildState) {
	const buildCachePath = resolve(buildState.project.path, "_gen", "cache.json");

	// Write cache
	await Deno.writeTextFile(
		buildCachePath,
		JSON.stringify(buildState.cache),
	);
}
