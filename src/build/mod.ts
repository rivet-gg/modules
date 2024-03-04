import { compileSchema } from "./schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import {
	compileModuleHelper,
	compileScriptHelper,
	compileTestHelper,
	compileTypeHelpers,
} from "./gen.ts";
import { Project } from "../project/project.ts";
import { generateDenoConfig } from "./deno_config.ts";
import { inflateRuntimeArchive } from "./inflate_runtime_archive.ts";
import { Module, Script, scriptGenPath } from "../project/mod.ts";
import { join } from "../deps.ts";
import { migrateDev } from "../migrate/dev.ts";
import { moduleGenPath } from "../project/module.ts";

/**
 * Stores the state of all of the generated files to speed up subsequent build
 * steps.
 */
export interface BuildCache {
	version: number;
	hashCache: Record<string, string>;
}

/**
 * Checks if the hash of a file has changed. Returns true if file changed.
 */
export async function compareHash(
	cache: BuildCache,
	paths: string[],
): Promise<boolean> {
	// TODO: Implement later
	return true;
}

/**
 * State for the curent build process.
 */
interface BuildState {
	cache: BuildCache;
	promises: Promise<void>[];
}

interface BuildStepOpts {
	name: string;
	module?: Module;
	script?: Script;
	build: () => Promise<void>;
	always?: boolean;
	files?: string[];
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
		// TODO: max parallel build steps
		// TODO: error handling
		if (
			opts.always ||
			(opts.files && await compareHash(buildState.cache, opts.files))
		) {
			console.log(`🔨 ${stepName}`);
			await opts.build();
		}
	};

	buildState.promises.push(fn());
}

async function waitForBuildPromises(buildState: BuildState): Promise<void> {
	const promises = buildState.promises;
	buildState.promises = [];
	await Promise.all(promises);
}

export async function build(project: Project) {
	const buildCache = {
		version: 1,
	} as BuildCache;

	const buildState = {
		cache: buildCache,
		promises: [],
	} as BuildState;

	await buildSteps(buildState, project);

	console.log("✅ Finished");
}

async function buildSteps(buildState: BuildState, project: Project) {
	// TODO: This is super messy
	// TODO: This does not reuse the Prisma dir
	// for (const module of project.modules.values()) {
	// 	if (module.db) {
	// 		buildStep(buildState, {
	// 			name: "Prisma schema",
	// 			module,
	// 			files: [join(module.path, "db", "schema.prisma")],
	// 			async build() {
	// 				await migrateDev(project, [module], { createOnly: false });
	// 			},
	// 		});

	// 		// Run for only one database at a time
	// 		await waitForBuildPromises(buildState);
	// 	}
	// }

	buildStep(buildState, {
		name: "Inflate runtime",
		// TODO: Add way to compare runtime version
		always: true,
		async build() {
			await inflateRuntimeArchive(project);
		},
	});

	// Wait for runtime since script schemas depend on this
	await waitForBuildPromises(buildState);

	for (const module of project.modules.values()) {
		await buildModule(buildState, project, module);
	}

	buildStep(buildState, {
		name: "Type helpers",
		files: [...project.modules.values()].map((m) =>
			join(m.path, "module.yaml")
		),
		async build() {
			await compileTypeHelpers(project);
		},
	});

	buildStep(buildState, {
		name: "Deno config",
		always: true,
		async build() {
			await generateDenoConfig(project);
		},
	});

	// Wait for module schemas requestSchema/responseSchema
	await waitForBuildPromises(buildState);

	buildStep(buildState, {
		name: "Entrypoint",
		always: true,
		async build() {
			await generateEntrypoint(project);
		},
	});

	buildStep(buildState, {
		name: "OpenAPI",
		always: true,
		async build() {
			await generateOpenApi(project);
		},
	});

	// TODO: SDKs

	await waitForBuildPromises(buildState);
}

async function buildModule(
	buildState: BuildState,
	project: Project,
	module: Module,
) {
	buildStep(buildState, {
		name: "Module helper",
		module,
		files: [join(module.path, "module.yaml")],
		async build() {
			await compileModuleHelper(project, module);
		},
	});

	buildStep(buildState, {
		name: "Test helper",
		module,
		files: [join(module.path, "module.yaml")],
		async build() {
			await compileTestHelper(project, module);
		},
	});

	for (const script of module.scripts.values()) {
		await buildScript(buildState, project, module, script);
	}
}

async function buildScript(
	buildState: BuildState,
	project: Project,
	module: Module,
	script: Script,
) {
	buildStep(buildState, {
		name: "Script schema",
		module,
		script,
		// TODO: check sections of module config
		// TODO: This module and all of its dependent modules
		// TODO: use tjs.getProgramFiles() to get the dependent files?
		files: [join(module.path, "module.yaml"), script.path],
		async build() {
			await compileSchema(project, module, script);
		},
	});

	buildStep(buildState, {
		name: "Script helper",
		module,
		script,
		// TODO: check sections of module config
		files: [join(module.path, "module.yaml"), script.path],
		async build() {
			await compileScriptHelper(project, module, script);
		},
	});
}
