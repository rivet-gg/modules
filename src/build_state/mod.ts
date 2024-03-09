import { Module, Project, Script } from "../project/mod.ts";
import { Cache, compareExprHash, compareFileHash, loadCache, shutdownCache } from "./cache.ts";

// TODO: Convert this to a build flag
export const FORCE_BUILD = false;

/**
 * State for the current build process.
 */
export interface BuildState {
	project: Project;
	cache: Cache;
	promises: Promise<void>[];
}

export async function createBuildState(project: Project): Promise<BuildState> {
	const cache = await loadCache(project);

	// Build state
	const buildState: BuildState = {
		project,
		cache,
		promises: [],
	};

	globalThis.addEventListener("unload", async () => await shutdownBuildState(buildState));

	return buildState;
}

export async function shutdownBuildState(buildState: BuildState) {
	await shutdownCache(buildState.project, buildState.cache);
}

interface BuildStepOpts {
	name: string;

	/** Module this build step is relevant to. Only affects printed status. */
	module?: Module;

	/** Script this build step is relevant to. Only affects printed status. */
	script?: Script;

	/**
	 * If specified, this build step will only run if any of the conditions are met.
	 *
	 * If not specified, the build step will always run.
	 */
	condition?: BuildStepCondition;

	/** Runs if the step is not cached. */
	build: () => Promise<void>;

	/** Runs if the step is cached. */
	alreadyCached?: () => Promise<void>;

	/** Runs after the step finishes. */
	finally?: () => Promise<void>;
}

interface BuildStepCondition {
	/** Runs if any of these files are changed, created, or deleted. */
	files?: string[];

	/** Runs if any of these expressions change. */
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
		// Determine if needs to be built
		let needsBuild: boolean;
		if (FORCE_BUILD || opts.condition === undefined) {
			needsBuild = true;
		} else {
			// Both of these are evaluated since both need to be persisted to the
			// cache if they change. Otherwise, if both a file and expr is change,
			// the next build will have a false positive when it hashes the
			// expression.
			const fileDiff = opts.condition?.files ? await compareFileHash(buildState.cache, opts.condition.files) : false;
			const exprDiff = opts.condition?.expressions
				? await compareExprHash(buildState.cache, opts.condition.expressions)
				: false;

			needsBuild = fileDiff || exprDiff;
		}

		// TODO: max parallel build steps
		// TODO: error handling
		if (needsBuild) {
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
