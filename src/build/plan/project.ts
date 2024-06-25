import { BuildState, buildStep, waitForBuildPromises } from "../../build_state/mod.ts";
import { exists, relative, resolve } from "../../deps.ts";
import { Project } from "../../project/mod.ts";
import { BuildOpts, Format, Runtime } from "../mod.ts";
import { generateClient } from "../../migrate/generate.ts";
import { planModuleBuild } from "./module.ts";
import { compileTypeHelpers } from "../gen/mod.ts";
import { generateDenoConfig } from "../deno_config.ts";
import { generateEntrypoint } from "../entrypoint.ts";
import { generateOpenApi } from "../openapi.ts";
import { InternalError } from "../../error/mod.ts";
import { UserError } from "../../error/mod.ts";
import { glob } from "../../project/deps.ts";
import { migrateDeploy } from "../../migrate/deploy.ts";
import { migrateDev } from "../../migrate/dev.ts";
import { generateMeta } from "../meta.ts";
import {
	BUNDLE_PATH,
	ENTRYPOINT_PATH,
	genPath,
	genPrismaOutputFolder,
	MANIFEST_PATH,
	RUNTIME_PATH,
} from "../../project/project.ts";
import { compileActorTypeHelpers } from "../gen/mod.ts";
import { inflateArchive } from "../util.ts";
import runtimeArchive from "../../../artifacts/runtime_archive.json" with { type: "json" };
import { nodeModulesPolyfillPlugin } from "npm:esbuild-plugins-node-modules-polyfill@1.6.4";

// Must match version in `esbuild_deno_loader`
//
// See also Prisma esbuild in `src/migrate/deps.ts`
import * as esbuild from "npm:esbuild@0.20.2";
import { denoPlugins } from "jsr:@rivet-gg/esbuild-deno-loader@0.10.3-fork.2";

export async function planProjectBuild(
	buildState: BuildState,
	project: Project,
	opts: BuildOpts,
) {
	const signal = buildState.signal;

	// Generate Prisma clients
	for (const module of project.modules.values()) {
		if (module.db) {
			buildStep(buildState, {
				id: `module.${module.name}.generate.prisma`,
				name: "Generate",
				description: `prisma_output/`,
				module,
				condition: {
					files: [resolve(module.path, "db", "schema.prisma")],
					expressions: {
						runtime: opts.runtime,
					},
				},
				async build({ signal }) {
					// Generate client
					await generateClient(project, [module], opts.runtime, signal);
				},
			});
		}
	}

	// TODO: Add way to compare runtime artifacts (or let this be handled by the cache version and never rerun?)
	buildStep(buildState, {
		id: `project.generate.runtime`,
		name: "Generate",
		description: "runtime/",
		async build({ signal }) {
			// Writes a copy of the OpenGB runtime bundled with the CLI to the project.
			const inflateRuntimePath = genPath(project, RUNTIME_PATH);
			await inflateArchive(runtimeArchive, inflateRuntimePath, "string", signal);
		},
	});

	// Wait for runtime since script schemas depend on this
	await waitForBuildPromises(buildState);

	for (const module of project.modules.values()) {
		await planModuleBuild(buildState, project, module, opts);
	}

	buildStep(buildState, {
		id: `project.generate.dependencies`,
		name: "Generate",
		description: "dependencies.d.ts",
		condition: {
			files: [...project.modules.values()].map((m) => resolve(m.path, "module.json")),
		},
		async build() {
			await compileTypeHelpers(project);
		},
	});

	buildStep(buildState, {
		id: `project.generate.actors`,
		name: "Generate",
		description: "actors.d.ts",
		condition: {
			files: [...project.modules.values()].map((m) => resolve(m.path, "module.json")),
		},
		async build() {
			await compileActorTypeHelpers(project);
		},
	});

	buildStep(buildState, {
		id: `project.generate.deno_config`,
		name: "Generate",
		description: "deno.json",
		async build() {
			await generateDenoConfig(project);
		},
	});

	// Wait for module schemas requestSchema/responseSchema
	await waitForBuildPromises(buildState);

	buildStep(buildState, {
		id: `project.generate.entrypoint`,
		name: "Generate",
		description: "entrypoint.ts",
		async build() {
			await generateEntrypoint(project, opts);
		},
	});

	buildStep(buildState, {
		id: `project.generate.openapi`,
		name: "Generate",
		description: "openapi.json",
		async build() {
			await generateOpenApi(project);
		},
	});

	buildStep(buildState, {
		id: `project.generate.meta`,
		name: "Generate",
		description: "meta.json",
		async build() {
			await generateMeta(project);
		},
	});

	if (opts.format == Format.Bundled) {
		buildStep(buildState, {
			id: `project.bundle`,
			name: "Bundle",
			description: "bundle.js",
			async build({ signal }) {
				const bundledFile = genPath(project, BUNDLE_PATH);

				// See Cloudflare Wrangler implementation:
				//
				// https://github.com/cloudflare/workers-sdk/blob/e8997b879605fb2eabc3e241086feb7aa219ef03/packages/wrangler/src/deployment-bundle/bundle.ts#L276
				const analyzeResult = Deno.env.get("_OPENGB_ESBUILD_META") == "1";
				const noMinify = Deno.env.get("_OPENGB_ESBUILD_NO_MINIFY") == "1";
				const result = await esbuild.build({
					entryPoints: [genPath(project, ENTRYPOINT_PATH)],
					outfile: bundledFile,
					platform: "browser",
					format: "esm",
					target: "es2022",
					sourcemap: true,
					conditions: ["workerd", "worker", "browser"],
					plugins: [
						// Deno
						//
						// This will resolve all npm, jsr, https, etc. imports. We disable
						// the `node` specifier so it will be polyfilled later.
						...denoPlugins({
							// Portable loader in order to work outside of Deno-specific contexts
							// loader: "portable",
							loader: "native",
							specifiers: {
								file: true,
								http: true,
								https: true,
								data: true,
								npm: true,
								jsr: true,
							},
						}),

						// Node
						nodeModulesPolyfillPlugin({
							globals: {
								Buffer: true,
								process: true,
							},
							modules: {
								// Not used:
								// https://github.com/brianc/node-postgres/blob/50c06f9bc6ff2ca1e8d7b7268b9af54ce49d72c1/packages/pg/lib/crypto/utils.js#L3
								crypto: "empty",
								dns: "empty",
								events: true,
								fs: "empty",
								net: "empty",
								path: "empty",
								string_decoder: true,
								tls: "empty",
								buffer: true,
							},
						}),
					],
					define: {
						// HACK: Disable `process.domain` in order to correctly handle this edge case:
						// https://github.com/brianc/node-postgres/blob/50c06f9bc6ff2ca1e8d7b7268b9af54ce49d72c1/packages/pg/lib/native/query.js#L126
						"process.domain": "undefined",
					},
					external: [
						// Check supported compat by Cloudflare Workers:
						// https://developers.cloudflare.com/workers/runtime-apis/nodejs/
						"node:process",
						"node:stream",
						"node:util",

						// TODO: Why is node:crypto not working? Are any of these external imports working?
						// https://community.cloudflare.com/t/not-being-able-to-import-node-crypto/613973
						// "node:crypto",

						// pg-native is overrided with pg-cloudflare at runtime
						"pg-native",

						// Wasm must be loaded as a separate file manually, cannot be bundled
						"*.wasm",
						"*.wasm?module",

						// This import only exists when running on cloudflare
						"cloudflare:*",
					],
					bundle: true,
					minify: !noMinify,

					logLevel: analyzeResult ? "debug" : "error",
					metafile: analyzeResult,
				});

				if (result.metafile) {
					console.log(await esbuild.analyzeMetafile(result.metafile));
				}

				signal.throwIfAborted();

				if (opts.runtime == Runtime.CloudflareWorkersPlatforms) {
					let bundleStr = await Deno.readTextFile(bundledFile);

					// Find any `query-engine.wasm`
					let wasmPath;
					for (const module of project.modules.values()) {
						const moduleWasmPath = resolve(
							genPrismaOutputFolder(project, module),
							"query_engine_bg.wasm",
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
							/file:[\w\\/\.\-]+query_engine_bg\.wasm/g,
							"query-engine.wasm",
						);
					} else if (/file:[\w\\/\.\-]+query_engine_bg\.wasm/.test(bundleStr)) {
						throw new InternalError("Failed to find required query_engine_bg.wasm", { path: bundledFile });
					}

					signal.throwIfAborted();

					await Deno.writeTextFile(bundledFile, bundleStr);

					// Write manifest of file paths for easier upload from Rivet CLI
					//
					// These modules are relative to the project root in case this was
					// generated from a Docker container.
					const manifest = {
						bundle: relative(project.path, bundledFile),
						wasm: wasmPath ? relative(project.path, wasmPath) : undefined,
					};

					signal.throwIfAborted();

					await Deno.writeTextFile(
						genPath(project, MANIFEST_PATH),
						JSON.stringify(manifest),
					);
				}
			},
		});
	}

	// TODO: SDKs

	await waitForBuildPromises(buildState);

	// TODO: This is disabled when building for cf because there is an unresolved import
	if (opts.runtime != Runtime.CloudflareWorkersPlatforms) {
		buildStep(buildState, {
			id: `project.check.entrypoint`,
			name: "Check",
			description: ".opengb/entrypoint.ts",
			async build() {
				const checkOutput = await new Deno.Command("deno", {
					args: ["check", "--quiet", resolve(project.path, ".opengb", "entrypoint.ts")],
					signal,
				}).output();
				if (!checkOutput.success) {
					throw new UserError("Check failed.", {
						details: new TextDecoder().decode(checkOutput.stderr).trim(),
					});
				}
			},
		});
	}

	await waitForBuildPromises(buildState);

	if (opts.migrate) {
		// Deploy external migrations in parallel
		for (const module of project.modules.values()) {
			if (module.db && (opts.migrate.forceDeploy || module.registry.isExternal)) {
				const migrations = await glob.glob(resolve(module.path, "db", "migrations", "*", "*.sql"));
				buildStep(buildState, {
					id: `module.${module.name}.migrate.deploy`,
					name: "Migrate Database",
					module,
					description: "deploy",
					condition: {
						files: migrations,
					},
					async build({ signal }) {
						await migrateDeploy(project, [module], signal);
					},
				});
			}
		}

		await waitForBuildPromises(buildState);

		// Deploy dev migrations one at a time
		for (const module of project.modules.values()) {
			if (module.db && !opts.migrate.forceDeploy && !module.registry.isExternal) {
				const migrations = await glob.glob(resolve(module.path, "db", "migrations", "*", "*.sql"));
				buildStep(buildState, {
					id: `module.${module.name}.migrate.dev`,
					name: "Migrate Database",
					module,
					description: "develop",
					condition: {
						files: [resolve(module.path, "db", "schema.prisma"), ...migrations],
					},
					async build({ signal }) {
						await migrateDev(project, [module], {
							createOnly: false,
							// HACK: Disable lock since running this command in watch does not clear the lock correctly
							disableSchemaLock: true,
							signal,
						});
					},
				});

				await waitForBuildPromises(buildState);
			}
		}
	}
}
