import { resolve } from "../deps.ts";
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
import { CommandError, UnreachableError } from "../error/mod.ts";
import { autoGenHeader } from "./misc.ts";
import { BuildOpts, DbDriver, Runtime, runtimeToString } from "./mod.ts";
import { dedent } from "./deps.ts";
import { convertSerializedSchemaToZodExpression } from "./schema/mod.ts";

export async function generateEntrypoint(project: Project, opts: BuildOpts) {
	const runtimeModPath = genRuntimeModPath(project);

	// Generate module configs
	const [modImports, modConfig] = generateModImports(project, opts);

	let imports = `
		// Schemas
		import * as z from "npm:zod@3.23.8";
		`;

	if (opts.dbDriver == DbDriver.NodePostgres) {
		imports += `
		// Import Prisma adapter for Postgres
		//
		// We can't use esm.sh for these because they rely on special Node
		// functionality & don't need to be portable
		//
		// https://github.com/esm-dev/esm.sh/issues/684
		import pg from "npm:pg@^8.11.3";
		import { PrismaPg } from "npm:@prisma/adapter-pg@^5.12.0";
		`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		imports += `
		// Import Prisma serverless adapter for Neon
    //
    // These versions need to be pinned because Neon relies on using
    // \`instanceof\`, so the dependencies must be exactly the same.
		import * as neon from "https://esm.sh/@neondatabase/serverless@0.9.3";
		import { PrismaNeon } from "https://esm.sh/@prisma/adapter-neon@5.17.0?deps=@neondatabase/serverless@0.9.3";
		`;
	} else if (opts.dbDriver == DbDriver.CloudflareHyperdrive) {
		imports += `
		// Import Prisma adapter for Postgres
		//
		// We can't use esm.sh for these because they rely on special Node
		// functionality & don't need to be portable
		//
		// https://github.com/esm-dev/esm.sh/issues/684
		// import 'npm:pg-cloudflare';
		import pg from "npm:pg@8.12.0";
		import { PrismaPg } from "npm:@prisma/adapter-pg@5.12.0";
		`;
	}

	// CORS
	let corsSource = "";
	if (project.config.runtime?.cors) {
		corsSource = `
			cors: {
				origins: new Set(${JSON.stringify(project.config.runtime.cors.origins)}),
			},
		`;
	}

	// Generate config.ts
	const configSource = `
		${autoGenHeader()}
		import { Config, BuildRuntime } from "${runtimeModPath}";

		${imports}
		${modImports}

		export default {
			runtime: BuildRuntime.${runtimeToString(opts.runtime)},
			modules: ${modConfig},
			${corsSource}
			db: {
				createPgPool: ${generateCreatePgPool(opts)},
			},
		} as Config;
		`;

	// Generate entrypoint.ts
	let entrypointSource = "";

	const actorDriverPath: string = genRuntimeActorDriverPath(project, opts.runtime);
	if (opts.runtime == Runtime.Deno) {
		entrypointSource = `
			${autoGenHeader()}
			import { Runtime } from "${runtimeModPath}";
			import { dependencyCaseConversionMap } from "${genDependencyCaseConversionMapPath(project)}";
			import { actorCaseConversionMap } from "${genActorCaseConversionMapPath(project)}";
			import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
			import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
			import config from "./runtime_config.ts";
			import { handleRequest } from ${
			JSON.stringify(projectGenPath(project, RUNTIME_PATH, "packages", "runtime", "src", "server.ts"))
		};
			import { ActorDriver } from ${JSON.stringify(actorDriverPath)};
			import { PathResolver } from ${
			JSON.stringify(projectGenPath(project, RUNTIME_PATH, "packages", "path_resolver", "src", "mod.ts"))
		};
			import { log } from ${
			JSON.stringify(projectGenPath(project, RUNTIME_PATH, "packages", "runtime", "src", "logger.ts"))
		};

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
		const serverTsPath = resolve(runtimePath, "packages", "runtime", "src", "server.ts");
		const errorTsPath = resolve(runtimePath, "packages", "runtime", "src", "error.ts");

		entrypointSource = `
			${autoGenHeader()}
			import type { IncomingRequestCf } from 'https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/common/cloudflare_workers_types.d.ts';
			import { Runtime, Environment } from "${runtimeModPath}";
			import { RuntimeError } from "${errorTsPath}";
			import { dependencyCaseConversionMap } from "${genDependencyCaseConversionMapPath(project)}";
			import { actorCaseConversionMap } from "${genActorCaseConversionMapPath(project)}";
			import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
			import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
			import config from "./runtime_config.ts";
			import { handleRequest } from ${JSON.stringify(serverTsPath)};
			import { ActorDriver, buildGlobalDurableObjectClass } from ${JSON.stringify(actorDriverPath)};
			import { PathResolver } from ${
			JSON.stringify(projectGenPath(project, RUNTIME_PATH, "packages", "path_resolver", "src", "mod.ts"))
		};

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
	const configPath = projectGenPath(project, RUNTIME_CONFIG_PATH);
	const entrypointPath = projectGenPath(project, ENTRYPOINT_PATH);

	await Deno.writeTextFile(configPath, configSource);
	await Deno.writeTextFile(entrypointPath, entrypointSource);
	await Deno.writeTextFile(
		projectGenPath(project, GITIGNORE_PATH),
		".",
	);

	// Format files
	const fmtOutput = await new Deno.Command("deno", {
		args: ["fmt", configPath, entrypointPath],
		signal: opts.signal,
	}).output();
	if (!fmtOutput.success) throw new CommandError("Failed to format generated files.", { commandOutput: fmtOutput });
}

function generateModImports(project: Project, opts: BuildOpts) {
	let modImports = "";
	let modConfig = "{";
	for (const mod of project.modules.values()) {
		modConfig += `${JSON.stringify(mod.name)}: {`;

		modConfig += `"storageAlias": ${JSON.stringify(mod.storageAlias)},`;

		// Generate script configs
		modConfig += "scripts: {";
		for (const script of mod.scripts.values()) {
			const runIdent = `modules$$${mod.name}$$${script.name}$$run`;

			modImports += `import { run as ${runIdent} } from '${mod.path}/scripts/${script.name}.ts';\n`;

			modConfig += `${JSON.stringify(script.name)}: {`;
			modConfig += `run: ${runIdent},`;
			modConfig += `public: ${JSON.stringify(script.config.public ?? false)},`;
			modConfig += `requestSchema: ${convertSerializedSchemaToZodExpression(script.schemas?.request!)},`;
			modConfig += `responseSchema: ${convertSerializedSchemaToZodExpression(script.schemas?.response!)},`;
			modConfig += `},`;
		}
		modConfig += "},";

		// Generate actor configs
		modConfig += "actors: {";
		for (const actor of mod.actors.values()) {
			const actorIdent = `modules$$${mod.name}$$${actor.name}$$Actor`;

			modImports += `import { Actor as ${actorIdent} } from '${mod.path}/actors/${actor.name}.ts';\n`;

			modConfig += `${JSON.stringify(actor.name)}: {`;
			modConfig += `actor: ${actorIdent},`;
			modConfig += `storageAlias: ${JSON.stringify(actor.storageAlias)},`;
			modConfig += `},`;
		}
		modConfig += "},";

		// Generate route configs
		modConfig += "routes: {";
		for (const route of mod.routes.values()) {
			const handleIdent = `modules$$${mod.name}$$${route.name}$$route$$handle`;

			modImports += `import { handle as ${handleIdent} } from '${mod.path}/routes/${route.name}.ts';\n`;

			modConfig += `${JSON.stringify(route.name)}: {`;
			modConfig += `run: ${handleIdent},`;
			const methods = route.config.method ? [route.config.method] : ["GET", "POST", "PUT", "PATCH", "DELETE"];
			modConfig += `methods: new Set(${JSON.stringify(methods)}),`;
			if ("path" in route.config) {
				modConfig += `path: ${JSON.stringify(route.config.path)},`;
			} else {
				modConfig += `pathPrefix: ${JSON.stringify(route.config.pathPrefix)},`;
			}
			modConfig += `},`;
		}
		modConfig += "},";

		// Generate error configs
		modConfig += `errors: ${JSON.stringify(mod.config.errors)},`;

		// Generate dependency lookup
		modConfig += `dependencies: new Set([`;
		modConfig += JSON.stringify(mod.name) + ",";
		for (const dependencyName in mod.config.dependencies) {
			modConfig += JSON.stringify(dependencyName) + ",";
		}
		modConfig += `]),`;

		// Generate db config
		if (mod.db) {
			const drizzleSchemaImportName = `drizzleSchema$$${mod.name}`;
			const drizzleSchemaImportPath = dbSchemaPath(mod);
			modImports += `import * as ${drizzleSchemaImportName} from ${JSON.stringify(drizzleSchemaImportPath)};\n`;

			modConfig += `db: {`;
			modConfig += `schemaName: ${JSON.stringify(mod.db.schema)},`;
			modConfig += `drizzleSchema: ${drizzleSchemaImportName},`, modConfig += `},`;
		} else {
			modConfig += `db: undefined,`;
		}

		// Generate user config
		modConfig += `userConfig: ${JSON.stringify(mod.userConfig)},`;

		modConfig += "},";
	}
	modConfig += "}";

	return [modImports, modConfig];
}

function generateCreatePgPool(opts: BuildOpts) {
	if (opts.dbDriver == DbDriver.NodePostgres) {
		return dedent`
			(url: URL) => {
				return new pg.Pool({
					connectionString: url.toString(),
				});
			}
		`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		return dedent`
			(url: URL) => {
				return new neon.Pool({
					connectionString: url.toString(),
				});
			}
		`;
	} else if (opts.dbDriver == DbDriver.CloudflareHyperdrive) {
		return dedent`
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
}

function hyperdriveAdapter(opts: BuildOpts): string {
	if (opts.dbDriver != DbDriver.CloudflareHyperdrive) return "";
	return dedent`
		interface Hyperdrive {
			connectionString: string;
		}

		env.DATABASE_URL = (env.__HYPERDRIVE as Hyperdrive).connectionString;
	`;
}
