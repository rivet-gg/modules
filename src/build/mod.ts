import { assertExists, denoPlugins, esbuild, exists, resolve } from "../deps.ts";
import { compileScriptSchema } from "./script_schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileModuleHelper, compileScriptHelper, compileTestHelper, compileTypeHelpers } from "./gen.ts";
import { Project } from "../project/project.ts";
import { generateDenoConfig } from "./deno_config.ts";
import { inflateRuntimeArchive } from "./inflate_runtime_archive.ts";
import { configPath, Module, Script } from "../project/mod.ts";
import { migrateDev } from "../migrate/dev.ts";
import { compileModuleTypeHelper } from "./gen.ts";
import { migrateDeploy } from "../migrate/deploy.ts";
import { ensurePostgresRunning } from "../utils/postgres_daemon.ts";
import { generateClient } from "../migrate/generate.ts";
import { compileModuleConfigSchema } from "./module_config_schema.ts";
import {
	BuildState,
	buildStep,
	createBuildState,
	shutdownBuildState,
	waitForBuildPromises,
} from "../build_state/mod.ts";
import { success } from "../term/status.ts";

/**
 * Which format to use for building.
 */
export enum Format {
	Native,
	Bundled,
}

/**
 * Which runtime to target when building.
 */
export enum Runtime {
	Deno,
	Cloudflare,
}

/**
 * Which DB driver to use for the runtime.
 */
export enum DbDriver {
	NodePostgres,
	NeonServerless,
}

/**
 * Stores options used in the build command.
 */
export interface BuildOpts {
	format: Format;
	runtime: Runtime;
	dbDriver: DbDriver;
}

export async function build(project: Project, opts: BuildOpts) {
	// Required for `migrateDev` and `migrateDeploy`
	await ensurePostgresRunning(project);

	const buildState = await createBuildState(project);

	// Run build
	await buildSteps(buildState, project, opts);

	await shutdownBuildState(buildState);

	success("Success");
}

async function buildSteps(
	buildState: BuildState,
	project: Project,
	opts: BuildOpts,
) {
	// TODO: This does not reuse the Prisma dir or the database connection, so is extra slow on the first run.
	// Figure out how to make this use one `migrateDev` command and pass in any modified modules For now,
	// these need to be migrated individually because `prisma migrate dev` is an interactive command. Also,
	// making a database change and waiting for all other databases to re-apply will take a long time.
	for (const module of project.modules.values()) {
		if (module.db) {
			buildStep(buildState, {
				name: "Migrate",
				description: `modules/${module.name}/db/schema.prisma`,
				module,
				// TODO: Also watch migrations folder in case a migration is created/destroyed
				condition: {
					files: [resolve(module.path, "db", "schema.prisma")],
					expressions: {
						"Runtime": opts.runtime,
					},
				},
				async build() {
					if (module.registry.isExternal || Deno.env.get("CI") === "true") {
						// Do not alter migrations, only deploy them
						await migrateDeploy(project, [module]);
					} else {
						// Update migrations
						await migrateDev(project, [module], {
							createOnly: false,
						});
					}

					// Generate client
					await generateClient(project, [module], opts.runtime);
				},
			});

			// Run one migration at a time since Prisma is interactive
			await waitForBuildPromises(buildState);
		}
	}

	// TODO: Add way to compare runtime artifacts (or let this be handled by the cache version and never rerun?)
	buildStep(buildState, {
		name: "Generate",
		description: "_gen/runtime/",
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
		name: "Generate",
		description: "_gen/registry.d.ts",
		condition: {
			files: [...project.modules.values()].map((m) => resolve(m.path, "module.yaml")),
		},
		async build() {
			await compileTypeHelpers(project);
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: "deno.json",
		async build() {
			await generateDenoConfig(project);
		},
	});

	// Wait for module schemas requestSchema/responseSchema
	await waitForBuildPromises(buildState);

	buildStep(buildState, {
		name: "Generate",
		description: "_gen/entrypoint.ts",
		async build() {
			await generateEntrypoint(project, opts);
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: "_gen/openapi.json",
		async build() {
			await generateOpenApi(project);
		},
	});

	if (opts.format == Format.Bundled) {
		buildStep(buildState, {
			name: "Bundle",
			description: "_gen/output.js",
			async build() {
				const gen = resolve(project.path, "_gen");
				const bundledFile = resolve(gen, "/output.js");

				await esbuild.build({
					entryPoints: [resolve(gen, "entrypoint.ts")],
					outfile: bundledFile,
					format: "esm",
					platform: "neutral",
					plugins: [...denoPlugins()],
					external: [
						// Don't include deno's crypto, its a standard js API
						"*crypto/crypto.ts",
						// Exclude node APIs, most are included in CF workers with
						// https://developers.cloudflare.com/workers/runtime-apis/nodejs/
						"node:*",
						// Wasm must be loaded as a separate file manually, cannot be bundled
						"*.wasm",
						"*.wasm?module",
					],
					bundle: true,
					minify: true,
				});

				// For some reason causes the program to exit early instead of waiting
				// await esbuild.stop();

				if (opts.runtime == Runtime.Cloudflare) {
					let bundleStr = await Deno.readTextFile(bundledFile);

					// Remove unused import to deno crypto
					bundleStr = bundleStr.replace(
						/import\{crypto as \w+\}from"https:\/\/deno\.land\/std@[\d\.]+\/crypto\/crypto\.ts";/,
						"",
					);

					// Remove unused import (`node:timers` isn't available in cf workers)
					// https://developers.cloudflare.com/workers/runtime-apis/nodejs/
					bundleStr = bundleStr.replaceAll(`import"node:timers";`, "");

					// Find any `query-engine.wasm`
					let wasmPath;
					for (const module of project.modules.values()) {
						const moduleWasmPath = resolve(
							module.path,
							"_gen",
							"prisma",
							"query-engine.wasm",
						);

						if (await exists(moduleWasmPath)) {
							wasmPath = moduleWasmPath;
							break;
						}
					}

					// Check if wasm is actually required
					if (wasmPath) {
						// Make wasm import relative
						bundleStr = bundleStr.replaceAll(
							/file:[\w\\/\.\-]+query-engine\.wasm/g,
							"query-engine.wasm",
						);
					} else if (/"[\w\\/\.\-]+query-engine\.wasm/.test(bundleStr)) {
						throw new Error("Failed to find required query-engine.wasm");
					}

					await Deno.writeTextFile(bundledFile, bundleStr);

					// Write manifest of file paths for easier upload from Rivet CLI
					const manifest = {
						bundle: bundledFile,
						wasm: wasmPath,
					};

					await Deno.writeTextFile(
						resolve(gen, "manifest.json"),
						JSON.stringify(manifest),
					);
				}
			},
		});
	}

	// TODO: SDKs

	await waitForBuildPromises(buildState);
}

async function buildModule(
	buildState: BuildState,
	project: Project,
	module: Module,
) {
	buildStep(buildState, {
		name: "Parse",
		description: `modules/${module.name}/config.ts`,
		module,
		condition: {
			// TODO: use tjs.getProgramFiles() to get the dependent files?
			files: [configPath(module)],
		},
		delayedStart: true,
		async build({ onStart }) {
			// Compile schema
			//
			// This mutates `module`
			await compileModuleConfigSchema(project, module, onStart);
		},
		async alreadyCached() {
			// Read schema from cache
			const schema = buildState.cache.persist.moduleConfigSchemas[module.name];
			assertExists(schema);
			module.configSchema = schema;
		},
		async finally() {
			assertExists(module.configSchema);

			// Populate cache with response
			buildState.cache.persist.moduleConfigSchemas[module.name] = module.configSchema;
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: `modules/${module.name}/_gen/registry.d.ts`,
		module,
		condition: {
			files: [resolve(module.path, "module.yaml")],
		},
		async build() {
			await compileModuleTypeHelper(project, module);
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: `modules/${module.name}/_gen/mod.ts`,
		module,
		condition: {
			files: [resolve(module.path, "module.yaml")],
		},
		async build() {
			await compileModuleHelper(project, module);
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: `modules/${module.name}/_gen/test.ts`,
		module,
		condition: {
			files: [resolve(module.path, "module.yaml")],
		},
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
		name: "Parse",
		description: `modules/${module.name}/scripts/${script.name}.ts`,
		module,
		script,
		condition: {
			// TODO: This module and all of its dependent scripts. Use tjs.getProgramFiles() to get the dependent files?
			files: [
				// If the script is modified
				script.path,
			],
			expressions: {
				// If a script is added, removed, or the config is changed
				"module.scripts": module.scripts,
			},
		},
		delayedStart: true,
		async build({ onStart }) {
			// Compile schema
			//
			// This mutates `script`
			await compileScriptSchema(project, module, script, onStart);
		},
		async alreadyCached() {
			// Read schemas from cache
			const schemas = buildState.cache.persist.scriptSchemas[module.name][script.name];
			assertExists(schemas);
			script.requestSchema = schemas.request;
			script.responseSchema = schemas.response;
		},
		async finally() {
			assertExists(script.requestSchema);
			assertExists(script.responseSchema);

			// Populate cache with response
			if (!buildState.cache.persist.scriptSchemas[module.name]) {
				buildState.cache.persist.scriptSchemas[module.name] = {};
			}
			buildState.cache.persist.scriptSchemas[module.name][script.name] = {
				request: script.requestSchema,
				response: script.responseSchema,
			};
		},
	});

	buildStep(buildState, {
		name: "Generate",
		description: `modules/${module.name}/_gen/scripts/${script.name}.ts`,
		module,
		script,
		condition: {
			// TODO: check specifically scripts section of module config
			files: [resolve(module.path, "module.yaml"), script.path],
		},
		async build() {
			await compileScriptHelper(project, module, script);
		},
	});
}
