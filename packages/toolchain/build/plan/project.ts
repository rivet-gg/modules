import { BuildState, buildStep, waitForBuildPromises } from "../../build_state/mod.ts";
import * as glob from "glob";
import { relative, resolve } from "@std/path";
import { mainConfigPath, Project } from "../../project/mod.ts";
import { BuildOpts, Format, MigrateMode, Runtime } from "../mod.ts";
import { planModuleBuild, planModuleParse } from "./module.ts";
import { compileTypeHelpers } from "../gen/mod.ts";
import { generateDenoConfig } from "../deno_config.ts";
import { generateEntrypoint } from "../entrypoint.ts";
import { generateOpenApi } from "../openapi.ts";
import { CombinedError, UnreachableError, UserError, ValidationError } from "../../error/mod.ts";
import { generateMeta } from "../meta.ts";
import { BUNDLE_PATH, ENTRYPOINT_PATH, MANIFEST_PATH, projectGenPath, RUNTIME_PATH } from "../../project/project.ts";
import { compileActorTypeHelpers } from "../gen/mod.ts";
import { inflateArchive } from "../util.ts";
import runtimeArchive from "../../../../artifacts/runtime_archive.json" with { type: "json" };
import { nodeModulesPolyfillPlugin } from "npm:esbuild-plugins-node-modules-polyfill@1.6.4";

// Must match version in `esbuild_deno_loader`
import * as esbuild from "npm:esbuild@0.20.2";
import { denoPlugins } from "jsr:@rivet-gg/esbuild-deno-loader@0.10.3-fork.2";
import { migratePush } from "../../migrate/push.ts";
import { migrateApply } from "../../migrate/apply.ts";
import { migrateGenerate } from "../../migrate/generate.ts";
import { convertSerializedSchemaToZod } from "../schema/mod.ts";

export async function planProjectBuild(
	buildState: BuildState,
	project: Project,
	opts: BuildOpts,
) {
	const signal = buildState.signal;

	for (const module of project.modules.values()) {
		await planModuleParse(buildState, project, module, opts);
	}

	// Wait for modules parse
	await waitForBuildPromises(buildState);

	buildStep(buildState, {
		id: `project.validate`,
		name: "Validate",
		description: "backend.json",
		condition: {
			files: [mainConfigPath(project)],
		},
		async build() {
			const errors: ValidationError[] = [];
			for (const module of project.modules.values()) {
				if (module.userConfigSchema) {
					const result = await convertSerializedSchemaToZod(module.userConfigSchema).safeParseAsync(
						module.userConfig,
					);

					if (!result.success) {
						errors.push(
							new ValidationError(`Invalid config for module "${module.name}".`, {
								validationError: result.error,
								path: mainConfigPath(project),
								info: { moduleName: module.name },
							}),
						);
					}
				}
			}
			if (errors.length > 0) {
				throw new CombinedError(errors);
			}
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

	// Wait for backend.json validation
	await waitForBuildPromises(buildState);

	// TODO: Add way to compare runtime artifacts (or let this be handled by the cache version and never rerun?)
	buildStep(buildState, {
		id: `project.generate.runtime`,
		name: "Generate",
		description: "runtime/",
		async build({ signal }) {
			// Writes a copy of the OpenGB runtime bundled with the CLI to the project.
			const inflateRuntimePath = projectGenPath(project, RUNTIME_PATH);
			await inflateArchive(runtimeArchive, inflateRuntimePath, "string", signal);
		},
	});

	await waitForBuildPromises(buildState);

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

	for (const module of project.modules.values()) {
		await planModuleBuild(buildState, project, module, opts);
	}

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

	if (opts.format == Format.Bundled) {
		buildStep(buildState, {
			id: `project.bundle`,
			name: "Bundle",
			description: "bundle.js",
			async build({ signal }) {
				const bundledFile = projectGenPath(project, BUNDLE_PATH);

				// See Cloudflare Wrangler implementation:
				//
				// https://github.com/cloudflare/workers-sdk/blob/e8997b879605fb2eabc3e241086feb7aa219ef03/packages/wrangler/src/deployment-bundle/bundle.ts#L276
				const analyzeResult = Deno.env.get("_OPENGB_ESBUILD_META") == "1";
				const noMinify = Deno.env.get("_OPENGB_ESBUILD_NO_MINIFY") == "1";
				const result = await esbuild.build({
					entryPoints: [projectGenPath(project, ENTRYPOINT_PATH)],
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
					const bundleStr = await Deno.readTextFile(bundledFile);

					// TODO: Add ability for injecting WASM modules
					// // Find any `query-engine.wasm`
					// let wasmPath;
					// for (const module of project.modules.values()) {
					// 	const moduleWasmPath = resolve(
					// 		genPrismaOutputFolder(project, module),
					// 		"query_engine_bg.wasm",
					// 	);
					//
					// 	if (await exists(moduleWasmPath)) {
					// 		wasmPath = moduleWasmPath;
					// 		break;
					// 	}
					// }
					//
					// // Check if wasm is actually required
					// if (wasmPath) {
					// 	// Make wasm import relative
					// 	bundleStr = bundleStr.replaceAll(
					// 		/file:[\w\\/\.\-]+query_engine_bg\.wasm/g,
					// 		"query-engine.wasm",
					// 	);
					// } else if (/file:[\w\\/\.\-]+query_engine_bg\.wasm/.test(bundleStr)) {
					// 	throw new InternalError("Failed to find required query_engine_bg.wasm", { path: bundledFile });
					// }

					signal.throwIfAborted();

					await Deno.writeTextFile(bundledFile, bundleStr);

					// Write manifest of file paths for easier upload from Rivet CLI
					//
					// These modules are relative to the project root in case this was
					// generated from a Docker container.
					const manifest = {
						bundle: relative(project.path, bundledFile),
						wasm: undefined,
						// wasm: wasmPath ? relative(project.path, wasmPath) : undefined,
					};

					signal.throwIfAborted();

					await Deno.writeTextFile(
						projectGenPath(project, MANIFEST_PATH),
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

	// Run migrations
	if (opts.migrate) {
		// Run local module migrations.
		//
		// We push the schema changes in order to allow developers to iterate
		// quickly. This has a risk of data loss, but we assume that this is fine
		// in development.

		// Split modules between how to apply the migration
		//
		// External modules are applied since they are not being modified.
		//
		// Local/dev modules are pushed since the schema will frequently change.
		// This has a risk of data loss, but this is required if iterating quickly
		// on a schema.
		const generateMigrations = [];
		const applyMigrations = [];
		const pushMigrations = [];
		for (const module of project.modules.values()) {
			if (module.db) {
				if (opts.migrate.mode == MigrateMode.Dev) {
					if (module.registry.isExternal) {
						applyMigrations.push(module);
					} else {
						pushMigrations.push(module);
					}
				} else if (opts.migrate.mode == MigrateMode.Generate) {
					if (!module.registry.isExternal) {
						generateMigrations.push(module);
					}
				} else if (opts.migrate.mode == MigrateMode.GenerateAndApply) {
					if (!module.registry.isExternal) {
						generateMigrations.push(module);
					}
					applyMigrations.push(module);
				} else if (opts.migrate.mode == MigrateMode.Apply) {
					applyMigrations.push(module);
				} else {
					throw new UnreachableError(opts.migrate.mode);
				}
			}
		}

		// Run generate commands one-by-one since they may have an interactive promp
		for (const module of generateMigrations) {
			buildStep(buildState, {
				id: `module.${module.name}.migrate.generate`,
				name: "Generate Migrations",
				module,
				description: "generate",
				condition: {
					files: [resolve(module.path, "db", "schema.ts")],
				},
				async build({ signal }) {
					await migrateGenerate(project, [module], signal);
				},
			});

			await waitForBuildPromises(buildState);
		}

		// Run push commands one-by-one since they may have an interactive promp
		for (const module of pushMigrations) {
			buildStep(buildState, {
				id: `module.${module.name}.migrate.push`,
				name: "Migrate Database",
				module,
				description: "push",
				condition: {
					files: [resolve(module.path, "db", "schema.ts")],
				},
				async build({ signal }) {
					await migratePush(project, [module], signal);
				},
			});

			await waitForBuildPromises(buildState);
		}

		// Run apply in parallel since it's non-interactive
		for (const module of applyMigrations) {
			const migrations = await glob.glob(resolve(module.path, "db", "migrations", "*", "*.sql"));
			buildStep(buildState, {
				id: `module.${module.name}.migrate.apply`,
				name: "Migrate Database",
				module,
				description: "apply",
				condition: {
					files: migrations,
				},
				async build({ signal }) {
					await migrateApply(project, [module], signal);
				},
			});
		}

		await waitForBuildPromises(buildState);
	}
}
