import { resolve } from "@std/path";
import { genActorCaseConversionMapPath, genRuntimeActorDriverPath, Project } from "../project/mod.ts";
import {
	ENTRYPOINT_PATH,
	genDependencyCaseConversionMapPath,
	genRuntimeModPath,
	GITIGNORE_PATH,
	projectGenPath,
	RUNTIME_CONFIG_PATH,
	RUNTIME_PATH,
} from "../project/project.ts";
import { dbSchemaPath } from "../project/module.ts";
import { UnreachableError } from "../error/mod.ts";
import { BuildOpts, DbDriver, Runtime, runtimeToString } from "./mod.ts";
import { DRIZZLE_KIT_VERSION, DRIZZLE_ORM_PACKAGE, PG_PACKAGE } from "../drizzle_consts.ts";
import { GeneratedCodeBuilder } from "./gen/mod.ts";
import { convertSerializedSchemaToZodExpression } from "./schema/mod.ts";

export async function generateEntrypoint(project: Project, opts: BuildOpts) {
	const runtimeModPath = genRuntimeModPath(project);

	const entrypoint = new GeneratedCodeBuilder(projectGenPath(project, ENTRYPOINT_PATH), 2);
	const config = new GeneratedCodeBuilder(projectGenPath(project, RUNTIME_CONFIG_PATH), 2);

	// Generate module configs
	const [modImports, modConfig] = generateModImports(project, entrypoint.path!);

	// Config imports
	config.chunk.withNewlinesPerChunk(1)
		.append`
			// Schemas
			import * as z from "https://esm.sh/zod@3.23.8";
		`;

	if (opts.dbDriver == DbDriver.NodePostgres) {
		config.chunk.append`
			// We can't use esm.sh for these because they rely on special Node
			// functionality & don't need to be portable
			//
			// https://github.com/esm-dev/esm.sh/issues/684
			import pg from "${PG_PACKAGE}";
			import { drizzle } from "${DRIZZLE_ORM_PACKAGE}/node-postgres";
		`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		config.chunk.append`
			// These versions need to be pinned because Neon relies on using
			// \`instanceof\`, so the dependencies must be exactly the same.
			import * as neon from "https://esm.sh/@neondatabase/serverless@0.9.3";
			import { drizzle } from "https://esm.sh/drizzle-orm@${DRIZZLE_KIT_VERSION}/neon-serverless";

			// TODO:
			// neonConfig.webSocketConstructor = ws;
		`;
	} else if (opts.dbDriver == DbDriver.CloudflareHyperdrive) {
		config.chunk.append`
			// We can't use esm.sh for these because they rely on special Node
			// functionality & don't need to be portable
			//
			// https://github.com/esm-dev/esm.sh/issues/684
			import pg from "${PG_PACKAGE}";
			import { drizzle } from "${DRIZZLE_ORM_PACKAGE}/node-postgres";
		`;
	}

	config.chunk.append`
		${modImports}
		import { Config, BuildRuntime } from ${JSON.stringify(config.relative(runtimeModPath))};
	`;

	// CORS
	let corsSource = "";
	if (project.config.runtime?.cors) {
		corsSource = `
			cors: {
				origins: new Set(${JSON.stringify(project.config.runtime.cors.origins)}),
			},
		`;
	}

	// Config export
	config.chunk.append`
		export default {
			runtime: BuildRuntime.${runtimeToString(opts.runtime)},
			modules: ${modConfig},
			${corsSource}
			db: {
				drizzleFn: drizzle,
				createPgPool: ${generateCreatePgPool(opts)}
			},
		} as Config;
	`;

	// Entrypoint imports
	const actorDriverPath: string = genRuntimeActorDriverPath(project, opts.runtime);
	if (opts.runtime == Runtime.Deno) {
		entrypoint.chunk.withNewlinesPerChunk(1)
			.append`
				import { Runtime } from ${JSON.stringify(entrypoint.relative(runtimeModPath))};
				import { dependencyCaseConversionMap } from ${
			JSON.stringify(entrypoint.relative(genDependencyCaseConversionMapPath(project)))
		};
				import { actorCaseConversionMap } from ${
			JSON.stringify(entrypoint.relative(genActorCaseConversionMapPath(project)))
		};
				import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
				import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
				import config from "./runtime_config.ts";
				import { handleRequest } from ${
			JSON.stringify(entrypoint.relative(projectGenPath(project, RUNTIME_PATH, "packages", "runtime", "server.ts")))
		};
				import { ActorDriver } from ${JSON.stringify(entrypoint.relative(actorDriverPath))};
				import { PathResolver } from ${
			JSON.stringify(entrypoint.relative(projectGenPath(project, RUNTIME_PATH, "packages", "path_resolver", "mod.ts")))
		};
				import { log } from ${
			JSON.stringify(entrypoint.relative(projectGenPath(project, RUNTIME_PATH, "packages", "runtime", "logger.ts")))
		};
			`;

		// Deno entrypoint
		entrypoint.chunk.append`
			const runtime = new Runtime<{
				dependenciesSnake: DependenciesSnake,
				dependenciesCamel: DependenciesCamel,
				actorsSnake: ActorsSnake,
				actorsCamel: ActorsCamel,
			}>(
				Deno.env,
				config,
				new ActorDriver(Deno.env, config, dependencyCaseConversionMap, actorCaseConversionMap),
				dependencyCaseConversionMap,
				actorCaseConversionMap,
			);

			const resolver = new PathResolver(runtime.routePaths());

			await Deno.serve(
				{
					hostname: runtime.hostname,
					port: runtime.port,
					onListen: () => {
						log(
							"info",
							"server started",
							["hostname", runtime.hostname],
							["port", runtime.port],
							["endpoint", runtime.publicEndpoint],
						);
					},
				},
				(req: Request, reqMeta: Deno.ServeHandlerInfo): Promise<Response> => {
					return handleRequest(
						runtime,
						req,
						{ remoteAddress: reqMeta.remoteAddr.hostname },
						resolver,
					);
				},
			).finished;
		`;
	} else if (opts.runtime == Runtime.CloudflareWorkersPlatforms) {
		const runtimePath = projectGenPath(project, RUNTIME_PATH);
		const serverTsPath = resolve(runtimePath, "packages", "runtime", "server.ts");
		const errorTsPath = resolve(runtimePath, "packages", "runtime", "error.ts");

		entrypoint.chunk.withNewlinesPerChunk(1)
			.append`
				import type { IncomingRequestCf } from 'https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/common/cloudflare_workers_types.d.ts';
				import { Runtime, Environment } from ${JSON.stringify(entrypoint.relative(runtimeModPath))};
				import { RuntimeError } from ${JSON.stringify(entrypoint.relative(errorTsPath))};
				import { dependencyCaseConversionMap } from ${
			JSON.stringify(entrypoint.relative(genDependencyCaseConversionMapPath(project)))
		};
				import { actorCaseConversionMap } from ${
			JSON.stringify(entrypoint.relative(genActorCaseConversionMapPath(project)))
		};
				import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
				import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
				import config from "./runtime_config.ts";
				import { handleRequest } from ${JSON.stringify(entrypoint.relative(serverTsPath))};
				import { ActorDriver, buildGlobalDurableObjectClass } from ${
			JSON.stringify(entrypoint.relative(actorDriverPath))
		};
				import { PathResolver } from ${
			JSON.stringify(entrypoint.relative(projectGenPath(project, RUNTIME_PATH, "packages", "path_resolver", "mod.ts")))
		};
			`;

		// Cloudflare entrypoint
		entrypoint.chunk.append`
			export default {
				async fetch(req: IncomingRequestCf, env: Record<string, unknown>, ctx) {
					${hyperdriveAdapter(opts)}

					// Environment adapter
					const envAdapter: Environment = {
						get(key: string): string | undefined {
							return env[key];
						},
					};

					// TODO(OGBE-159): Move this back to global scope after dbs are correctly isolated
					const runtime = new Runtime<{
						dependenciesSnake: DependenciesSnake,
						dependenciesCamel: DependenciesCamel,
						actorsSnake: ActorsSnake,
						actorsCamel: ActorsCamel,
					}>(
						envAdapter,
						config,
						new ActorDriver(envAdapter, config, dependencyCaseConversionMap, actorCaseConversionMap),
						dependencyCaseConversionMap,
						actorCaseConversionMap,
					);

					const resolver = new PathResolver(runtime.routePaths());

					const ip = req.headers.get("CF-Connecting-IP");
					if (!ip) {
						throw new RuntimeError(
							"CANNOT_READ_IP",
							{ cause: "Could not get IP of incoming request" },
						);
					}

					const responsePromise = await handleRequest(
						runtime,
						req,
						{ remoteAddress: ip, },
						resolver,
					);

					// Don't shut down the request until it finishes. This way,
					// write operations can't be interrupted mid-promise if the
					// user cancels the request.
					ctx.waitUntil(responsePromise);

					return await responsePromise;
				}
			}

			// Export durable object binding
			const __GlobalDurableObject = buildGlobalDurableObjectClass(config, dependencyCaseConversionMap, actorCaseConversionMap);
			export { __GlobalDurableObject };
		`;
	}

	// Write files
	await config.write();
	await entrypoint.write();

	await Deno.writeTextFile(
		projectGenPath(project, GITIGNORE_PATH),
		".",
	);
}

function generateModImports(project: Project, path: string) {
	const modImports = new GeneratedCodeBuilder(path);
	const modConfig = new GeneratedCodeBuilder(path);

	modConfig.append`{`;

	for (const mod of project.modules.values()) {
		modConfig.append`${JSON.stringify(mod.name)}: {`;

		modConfig.append`"storageAlias": ${JSON.stringify(mod.storageAlias)},`;

		// Generate script configs
		modConfig.append`scripts: {`;
		for (const script of mod.scripts.values()) {
			const runIdent = `modules$$${mod.name}$$${script.name}$$run`;

			modImports.append`import { run as ${runIdent} } from ${
				JSON.stringify(modImports.relative(resolve(mod.path, "scripts", `${script.name}.ts`)))
			};`;

			modConfig.append`${JSON.stringify(script.name)}: {`;
			modConfig.append`run: ${runIdent},`;
			modConfig.append`public: ${JSON.stringify(script.config.public ?? false)},`;
			modConfig.append`requestSchema: ${convertSerializedSchemaToZodExpression(script.schemas?.request!)},`;
			modConfig.append`responseSchema: ${convertSerializedSchemaToZodExpression(script.schemas?.response!)},`;
			modConfig.append`},`;
		}
		modConfig.append`},`;

		// Generate actor configs
		modConfig.append`actors: {`;
		for (const actor of mod.actors.values()) {
			const actorIdent = `modules$$${mod.name}$$${actor.name}$$Actor`;

			modImports.append`import { Actor as ${actorIdent} } from ${
				JSON.stringify(modImports.relative(resolve(mod.path, "actors", `${actor.name}.ts`)))
			};`;

			modConfig.append`${JSON.stringify(actor.name)}: {`;
			modConfig.append`actor: ${actorIdent},`;
			modConfig.append`storageAlias: ${JSON.stringify(actor.storageAlias)},`;
			modConfig.append`},`;
		}
		modConfig.append`},`;

		// Generate route configs
		modConfig.append`routes: {`;
		for (const route of mod.routes.values()) {
			const handleIdent = `modules$$${mod.name}$$${route.name}$$route$$handle`;

			modImports.append`import { handle as ${handleIdent} } from ${
				JSON.stringify(modImports.relative(resolve(mod.path, "routes", `${route.name}.ts`)))
			};`;

			modConfig.append`${JSON.stringify(route.name)}: {`;
			modConfig.append`run: ${handleIdent},`;
			const methods = route.config.method ? [route.config.method] : ["GET", "POST", "PUT", "PATCH", "DELETE"];
			modConfig.append`methods: new Set(${JSON.stringify(methods)}),`;
			if ("path" in route.config) {
				modConfig.append`path: ${JSON.stringify(route.config.path)},`;
			} else {
				modConfig.append`pathPrefix: ${JSON.stringify(route.config.pathPrefix)},`;
			}
			modConfig.append`},`;
		}
		modConfig.append`},`;

		// Generate error configs
		modConfig.append`errors: ${JSON.stringify(mod.config.errors)},`;

		// Generate dependency lookup
		modConfig.append`dependencies: new Set([`;
		modConfig.append`${JSON.stringify(mod.name)},`;
		for (const dependencyName in mod.config.dependencies) {
			modConfig.append`${JSON.stringify(dependencyName)},`;
		}
		modConfig.append`]),`;

		// Generate db config
		if (mod.db) {
			const drizzleSchemaImportName = `drizzleSchema$$${mod.name}`;
			const drizzleSchemaImportPath = dbSchemaPath(mod);
			modImports.append`import * as ${drizzleSchemaImportName} from ${
				JSON.stringify(modImports.relative(drizzleSchemaImportPath))
			};`;

			modConfig.append`db: {`;
			modConfig.append`schemaName: ${JSON.stringify(mod.db.schema)},`;
			modConfig.append`drizzleSchema: ${drizzleSchemaImportName},`;
			modConfig.append`},`;
		} else {
			modConfig.append`db: undefined,`;
		}

		// Generate user config
		modConfig.append`userConfig: ${JSON.stringify(mod.userConfig)},`;

		modConfig.append`},`;
	}
	modConfig.append`}`;

	return [modImports, modConfig];
}

function generateCreatePgPool(opts: BuildOpts) {
	const output = new GeneratedCodeBuilder();
	if (opts.dbDriver == DbDriver.NodePostgres) {
		output.append`
			(url: URL) => {
				return new pg.Pool({
					connectionString: url.toString(),
				});
			}
		`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		output.append`
			(url: URL) => {
				return new neon.Pool({
					connectionString: url.toString(),
				});
			}
		`;
	} else if (opts.dbDriver == DbDriver.CloudflareHyperdrive) {
		output.append`
			(url: URL) => {
				return new pg.Pool({
					connectionString: url.toString(),
					// Limit connection pool size since Hyperdrive already maintains a pool
					//
					// https://github.com/prisma/prisma/issues/23367#issuecomment-1981340554
					max: 2,
				});
			}
		`;
	} else {
		throw new UnreachableError(opts.dbDriver);
	}
	return output;
}

function hyperdriveAdapter(opts: BuildOpts) {
	const output = new GeneratedCodeBuilder();
	if (opts.dbDriver != DbDriver.CloudflareHyperdrive) return;
	output.append`
		interface Hyperdrive {
			connectionString: string;
		}

		env.DATABASE_URL = (env.__HYPERDRIVE as Hyperdrive).connectionString;
	`;
	return output;
}
