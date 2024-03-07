import { assertExists, denoPlugins, esbuild, exists, resolve, tjs } from "../deps.ts";
import { crypto, encodeHex } from "./deps.ts";
import { compileScriptSchema } from "./script_schema.ts";
import { generateEntrypoint } from "./entrypoint.ts";
import { generateOpenApi } from "./openapi.ts";
import { compileModuleHelper, compileScriptHelper, compileTestHelper, compileTypeHelpers } from "./gen.ts";
import { Project } from "../project/project.ts";
import { generateDenoConfig } from "./deno_config.ts";
import { inflateRuntimeArchive } from "./inflate_runtime_archive.ts";
import { configPath, Module, Script } from "../project/mod.ts";
import { shutdownAllPools } from "../utils/worker_pool.ts";
import { migrateDev } from "../migrate/dev.ts";
import { compileModuleTypeHelper } from "./gen.ts";
import { migrateDeploy } from "../migrate/deploy.ts";
import { ensurePostgresRunning } from "../utils/postgres_daemon.ts";
import { generateClient } from "../migrate/generate.ts";
import { compileModuleConfigSchema } from "./module_config_schema.ts";

// TODO: Replace this with the OpenGB version instead since it means we'll change . We need to compile this in the build artifacts.
const CACHE_VERSION = 2;

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

/**
 * Stores the state of all of the generated files to speed up subsequent build
 * steps.
 */
export interface BuildCache {
	oldCache: BuildCachePersist;
	newCache: BuildCachePersist;
}

/**
 * Data from `BuildCache` that gets persisted.
 */
interface BuildCachePersist {
	version: number;
	fileHashes: Record<string, FileHash>;
	exprHashes: Record<string, string>;
	moduleConfigSchemas: Record<string, tjs.Definition>;
	scriptSchemas: Record<
		string,
		Record<string, { request: tjs.Definition; response: tjs.Definition }>
	>;
}

type FileHash = { hash: string } | { missing: true };

function createDefaultCache(): BuildCachePersist {
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
	cache: BuildCache,
	paths: string[],
): Promise<boolean> {
	// We hash all files regardless of if we already know there was a change so
	// we can re-use these hashes on the next run to see if anything changed.
	let hasChanged = false;
	for (const path of paths) {
		const oldHash = cache.oldCache.fileHashes[path];
		const newHash = await hashFile(cache, path);
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
	cache: BuildCache,
	path: string,
): Promise<FileHash> {
	// Return already calculated hash
	let hash = cache.newCache.fileHashes[path];
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

	cache.newCache.fileHashes[path] = hash;
	return hash;
}

/**
 * Checks if the hash of an expression has changed. Returns true if expression changed.
 */
export async function compareExprHash(
	cache: BuildCache,
	exprs: Record<string, string>,
): Promise<boolean> {
	// We hash all files regardless of if we already know there was a change so
	// we can re-use these hashes on the next run to see if anything changed.
	let hasChanged = false;
	for (const [name, value] of Object.entries(exprs)) {
		const oldHash = cache.oldCache.exprHashes[name];
		const newHash = await hashExpr(cache, name, value);
		if (newHash != oldHash) {
			hasChanged = true;
			console.log(`✏️  ${name}`);
		}
	}

	return hasChanged;
}

export async function hashExpr(
	cache: BuildCache,
	name: string,
	value: any,
): Promise<string> {
	// Return already calculated hash
	let hash = cache.newCache.exprHashes[name];
	if (hash) return hash;

	// Calculate hash
	const exprHashBuffer = await crypto.subtle.digest(
		"SHA-256",
		await new Blob([value]).arrayBuffer(),
	);
	hash = encodeHex(exprHashBuffer);
	cache.newCache.exprHashes[name] = hash;

	return hash;
}

/**
 * State for the current build process.
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
	alreadyCached?: () => Promise<void>;
	finally?: () => Promise<void>;
	always?: boolean;
	files?: string[];
	expressions?: Record<string, any>;
}

// TODO: Convert this to a build flag
const FORCE_BUILD = false;

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
		const fileDiff = opts.files && await compareHash(buildState.cache, opts.files);
		const exprDiff = opts.expressions &&
			await compareExprHash(buildState.cache, opts.expressions);

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

async function waitForBuildPromises(buildState: BuildState): Promise<void> {
	const promises = buildState.promises;
	buildState.promises = [];
	await Promise.all(promises);
}

export async function build(project: Project, opts: BuildOpts) {
	const buildCachePath = resolve(project.path, "_gen", "cache.json");

	// Required for `migrateDev` and `migrateDeploy`
	await ensurePostgresRunning(project);

	// Read hashes from file
	let oldCache: BuildCachePersist;
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

	// Build cache
	const buildCache = {
		oldCache,
		newCache: createDefaultCache(),
	} as BuildCache;

	// Build state
	const buildState = {
		cache: buildCache,
		promises: [],
	} as BuildState;

	// Run build
	await buildSteps(buildState, project, opts);

	// Write cache
	await Deno.writeTextFile(
		buildCachePath,
		JSON.stringify(buildState.cache.newCache),
	);

	console.log("✅ Finished");

	shutdownAllPools();
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
				name: `Migrate`,
				module,
				// TODO: Also watch migrations folder in case a migration is created/destroyed
				files: [resolve(module.path, "db", "schema.prisma")],
				expressions: {
					"Runtime": opts.runtime,
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
		files: [...project.modules.values()].map((m) => resolve(m.path, "module.yaml")),
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
			await generateEntrypoint(project, opts);
		},
	});

	buildStep(buildState, {
		name: "OpenAPI",
		always: true,
		async build() {
			await generateOpenApi(project);
		},
	});

	if (opts.format == Format.Bundled) {
		buildStep(buildState, {
			name: "Bundle",
			always: true,
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
	// TODO: This has problems with missing files
	buildStep(buildState, {
		name: "Module config",
		module,
		// TODO: use tjs.getProgramFiles() to get the dependent files?
		files: [configPath(module)],
		async build() {
			// Compile schema
			//
			// This mutates `module`
			await compileModuleConfigSchema(project, module);
		},
		async alreadyCached() {
			// Read schema from cache
			module.configSchema = buildState.cache.oldCache.moduleConfigSchemas[module.name];
		},
		async finally() {
			// Populate cache with response
			if (module.configSchema) buildState.cache.newCache.moduleConfigSchemas[module.name] = module.configSchema;
		},
	});

	buildStep(buildState, {
		name: "Module helper",
		module,
		files: [resolve(module.path, "module.yaml")],
		async build() {
			await compileModuleHelper(project, module);
		},
	});

	buildStep(buildState, {
		name: "Type helper",
		module,
		files: [resolve(module.path, "module.yaml")],
		async build() {
			await compileModuleTypeHelper(project, module);
		},
	});

	buildStep(buildState, {
		name: "Test helper",
		module,
		files: [resolve(module.path, "module.yaml")],
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
		// TODO: `scripts` portion of module config instead of entire file
		// TODO: This module and all of its dependent modules
		// TODO: use tjs.getProgramFiles() to get the dependent files?
		files: [resolve(module.path, "module.yaml"), script.path],
		async build() {
			// Compile schema
			//
			// This mutates `script`
			await compileScriptSchema(project, module, script);
		},
		async alreadyCached() {
			// Read schemas from cache
			const schemas = buildState.cache.oldCache.scriptSchemas[module.name][script.name];
			assertExists(schemas);
			script.requestSchema = schemas.request;
			script.responseSchema = schemas.response;
		},
		async finally() {
			assertExists(script.requestSchema);
			assertExists(script.responseSchema);

			// Populate cache with response
			if (!buildState.cache.newCache.scriptSchemas[module.name]) {
				buildState.cache.newCache.scriptSchemas[module.name] = {};
			}
			buildState.cache.newCache.scriptSchemas[module.name][script.name] = {
				request: script.requestSchema,
				response: script.responseSchema,
			};
		},
	});

	buildStep(buildState, {
		name: "Script helper",
		module,
		script,
		// TODO: check sections of module config
		files: [resolve(module.path, "module.yaml"), script.path],
		async build() {
			await compileScriptHelper(project, module, script);
		},
	});
}
