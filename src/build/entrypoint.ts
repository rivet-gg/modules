import { dirname, fromFileUrl, resolve } from "../deps.ts";
import { ACTOR_PATH, Project, genActorCaseConversionMapPath } from "../project/mod.ts";
import { ENTRYPOINT_PATH, GITIGNORE_PATH, RUNTIME_CONFIG_PATH, RUNTIME_PATH, genDependencyCaseConversionMapPath, genPath, genPrismaOutputBundle, genRuntimeModPath } from "../project/project.ts";
import { CommandError } from "../error/mod.ts";
import { autoGenHeader } from "./misc.ts";
import { BuildOpts, DbDriver, Runtime } from "./mod.ts";
import { dedent } from "./deps.ts";

// Read source files as strings
// const ACTOR_SOURCE = await Deno.readTextFile(resolve(dirname(fromFileUrl(import.meta.url)), "../dynamic/actor.ts"));
// const ACTOR_CF_SOURCE = await Deno.readTextFile(
// 	resolve(dirname(fromFileUrl(import.meta.url)), "../dynamic/actor_cf.ts"),
// );

// HACK(OGBE-138): Disable actor source until dynamic generation works
const ACTOR_SOURCE = `
// This file is only imported when the runtime is \`Deno\`. See \`actor_cf.ts\` in the same directory.

const ENCODER = new TextEncoder();
const ACTOR_STORAGE: Map<string, {
	actor: ActorBase;
	storage: Map<string, any>;
}> = new Map();

export const ACTOR_DRIVER = {
	async getId(moduleName: string, actorName: string, label: string) {
		const storageId = config.modules[moduleName].actors[actorName].storageId;
		const name = \`%%\${storageId}%%\${label}\`;

		return await hash(name);
	},
	async getActor(moduleName: string, actorName: string, label: string) {
		const id = await ACTOR_DRIVER.getId(moduleName, actorName, label);
		const entry = ACTOR_STORAGE.get(id);

		if (entry == undefined) throw new Error("actor not initialized");

		return entry.actor;
	},
	async createActor(moduleName: string, actorName: string, label: string, input: any) {
		const id = await ACTOR_DRIVER.getId(moduleName, actorName, label);

		// Create actor instance
		const actorClass = config.modules[moduleName].actors[actorName].actor;
		const actor = new actorClass(new StorageProxy(id), actorClass.buildState(input));

		ACTOR_STORAGE.set(id, {
			actor,
			storage: new Map(),
		});
	},
	async callActor(stub: ActorBase, fn: string, ...args: any[]) {
		let res = (stub as any)[fn](...args);
		if (res instanceof Promise) res = await res;

		return res;
	},
	async actorExists(moduleName: string, actorName: string, label: string) {
		const id = await ACTOR_DRIVER.getId(moduleName, actorName, label);

		return ACTOR_STORAGE.has(id);
	},
};

/**
* Actor implementation that user-made actors will extend.
* Not meant to be instantiated.
*/
export abstract class ActorBase {
	static buildState(_input: unknown): any {
		throw Error("unimplemented");
	}

	constructor(public storage: StorageProxy, public state: unknown) {}
}

// Emulates the storage from cloudflare durable objects
export class StorageProxy {
	constructor(private id: string) {}

	async get(keys: string | string[]): Promise<Map<string, any> | any> {
		if (keys instanceof Array) {
			return new Map(keys.map((key) => [key, ACTOR_STORAGE.get(this.id)!.storage.get(key)]));
		} else {
			return ACTOR_STORAGE.get(this.id)!.storage.get(keys);
		}
	}

	async put(key: string, value: any) {
		ACTOR_STORAGE.get(this.id)!.storage.set(key, value);
	}

	async delete(keys: string | string[]) {
		const handle = ACTOR_STORAGE.get(this.id)!.storage;

		if (keys instanceof Array) {
			return keys.map((key) => {
				const exists = handle.has(key);

				if (exists) handle.delete(key);

				return exists;
			}).reduce((s, a) => s + Number(a), 0);
		} else {
			const exists = handle.has(keys);

			if (exists) handle.delete(keys);

			return exists;
		}
	}
}

async function hash(input: string) {
	const data = ENCODER.encode(input);
	const hash = await crypto.subtle.digest("SHA-256", data);
	const hashString = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");

	return hashString;
}
`
const ACTOR_CF_SOURCE = `
// This file is only imported when the runtime is \`Cloudflare\`. See \`actor.ts\` in the same directory.

// This import comes directly from the workers runtime
import { DurableObject } from "cloudflare:workers";

export const ACTOR_DRIVER = {
	async getId(moduleName: string, actorName: string, label: string) {
		const storageId = config.modules[moduleName].actors[actorName].storageId;
		const name = \`%%\${storageId}%%\${label}\`;
		const doHandle = Deno.env.get("__GLOBAL_DURABLE_OBJECT") as any as DurableObjectHandle;

		// throw new Error(\`\${name}\n\${doHandle.idFromName(name)}\`);

		return doHandle.idFromName(name);
	},
	async getActor(moduleName: string, actorName: string, label: string) {
		const id = await ACTOR_DRIVER.getId(moduleName, actorName, label);
		const doHandle = Deno.env.get("__GLOBAL_DURABLE_OBJECT") as any as DurableObjectHandle;
		const doStub = doHandle.get(id) as __GlobalDurableObject;

		return doStub;
	},
	async createActor(moduleName: string, actorName: string, label: string, input: any) {
		const stub = await ACTOR_DRIVER.getActor(moduleName, actorName, label);

		await stub.__init(moduleName, actorName, input);

		return stub;
	},
	async callActor(stub: __GlobalDurableObject, fn: string, ...args: any[]) {
		return await stub.__call(fn, args);
	},
	async actorExists(moduleName: string, actorName: string, label: string) {
		const stub = await ACTOR_DRIVER.getActor(moduleName, actorName, label);

		return await stub.__initialized();
	},
};

export class __GlobalDurableObject extends DurableObject {
	async __init(moduleName: string, actorName: string, input: any) {
		// Store module name and actor name
		await this.ctx.storage.put("__path", [moduleName, actorName]);

		// Build initial state
		const state = config.modules[moduleName].actors[actorName].actor.buildState(input);
		await this.ctx.storage.put("state", state);
	}

	async __initialized() {
		return await this.ctx.storage.get("__path") != undefined;
	}

	async __call(fn: string, args: any[]): Promise<any> {
		const storageRes = await this.ctx.storage.get(["state", "__path"]);
		const state = storageRes.get("state");
		if (state == undefined) throw Error("actor not initiated");

		// Create actor instance
		const [moduleName, actorName] = storageRes.get("__path");

		const actorClass = config.modules[moduleName].actors[actorName].actor;
		const actor = new actorClass(this.ctx.storage, state);

		// Run actor function
		let res = (actor as any)[fn](...args);
		if (res instanceof Promise) res = await res;

		// Update state
		await this.ctx.storage.put("state", actor!.state);

		return res;
	}
}

/**
* Actor implementation that user-made actors will extend.
* Not meant to be instantiated.
*/
export abstract class ActorBase {
	static buildState(_input: unknown): any {
		throw Error("buildState unimplemented");
	}

	private constructor(public storage: DurableObjectStorage, public state: unknown) {}
}

// TODO: Replace with imported types, maybe from denoflare
declare type DurableObjectCtx = {
	storage: DurableObjectStorage;
};
declare class DurableObjectStorage {
	get(keys: string | string[]): Promise<Map<string, any> | any>;
	put(key: string, value: any): Promise<void>;
	delete(keys: string | string[]): Promise<number | boolean>;
}
declare class DurableObjectHandle {
	idFromName(name: string): DurableObjectId;
	get(id: DurableObjectId): DurableObject;
}
declare type DurableObjectId = any;
declare type DurableObjectEnv = any;

declare class DurableObject {
	protected ctx: DurableObjectCtx;
	protected env: DurableObjectEnv;
}
`;

export async function generateEntrypoint(project: Project, opts: BuildOpts) {
	const runtimeModPath = genRuntimeModPath(project);

	// Generate module configs
	const [modImports, modConfig] = generateModImports(project, opts);

	let imports = "";

	if (opts.dbDriver == DbDriver.NodePostgres) {
		imports += `
		// Import Prisma adapter for Postgres
		import pg from "npm:pg@^8.11.3";
		import { PrismaPg } from "npm:@prisma/adapter-pg@^5.12.0";
		`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		imports += `
		// Import Prisma serverless adapter for Neon
		import * as neon from "https://esm.sh/@neondatabase/serverless@^0.9.3";
		import { PrismaNeonHTTP } from "https://esm.sh/@prisma/adapter-neon@^5.13.0";
		`;
	}

	let compat = "";
	let actorSource = `
		import { Config } from "${runtimeModPath}";
		import config from "./runtime_config.ts";
	`;

	if (opts.runtime == Runtime.Deno) {
		compat += `
			// Create module for Prisma compatibility
			import { createRequire } from "node:module";
			const require = createRequire(import.meta.url);
			`;

		actorSource += ACTOR_SOURCE;
	} else {
		actorSource += ACTOR_CF_SOURCE;
	}

	// Generate config.ts
	const configSource = `
		${autoGenHeader()}
		import { Config } from "${runtimeModPath}";

		${compat}
		${imports}
		${modImports}

		export default {
			modules: ${modConfig},
		} as Config;
		`;

	// Generate entrypoint.ts
	let entrypointSource = "";

	if (opts.runtime == Runtime.Deno) {
		entrypointSource = `
			${autoGenHeader()}
			import { Runtime } from "${runtimeModPath}";
			import { dependencyCaseConversionMap } from "${genDependencyCaseConversionMapPath(project)}";
			import { actorCaseConversionMap } from "${genActorCaseConversionMapPath(project)}";
			import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
			import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
			import config from "./runtime_config.ts";
			import { ACTOR_DRIVER } from "./actor.ts";

			async function main() {
				const runtime = new Runtime<
					DependenciesSnake, DependenciesCamel, ActorsSnake, ActorsCamel
				>(
					config,
					ACTOR_DRIVER,
					dependencyCaseConversionMap,
					actorCaseConversionMap,
				);
				await runtime.serve();
			}

			main();
			`;
	} else if (opts.runtime == Runtime.Cloudflare) {
		const runtimePath = genPath(project, RUNTIME_PATH);
		const serverTsPath = resolve(runtimePath, "src", "runtime", "server.ts");
		const errorTsPath = resolve(runtimePath, "src", "runtime", "error.ts");

		entrypointSource = `
			${autoGenHeader()}
			import type { IncomingRequestCf } from 'https://raw.githubusercontent.com/skymethod/denoflare/v0.6.0/common/cloudflare_workers_types.d.ts';
			import { Runtime } from "${runtimeModPath}";
			import { RuntimeError } from "${errorTsPath}";
			import { dependencyCaseConversionMap } from "${genDependencyCaseConversionMapPath(project)}";
			import { actorCaseConversionMap } from "${genActorCaseConversionMapPath(project)}";
			import type { DependenciesSnake, DependenciesCamel } from "./dependencies.d.ts";
			import type { ActorsSnake, ActorsCamel } from "./actors.d.ts";
			import config from "./runtime_config.ts";
			import { handleRequest } from "${serverTsPath}";
			import { ACTOR_DRIVER } from "./actor.ts";

			const RUNTIME = new Runtime<
				DependenciesSnake, DependenciesCamel, ActorsSnake, ActorsCamel
			>(
				config,
				ACTOR_DRIVER,
				dependencyCaseConversionMap,
				actorCaseConversionMap,
			);

			export default {
				async fetch(req: IncomingRequestCf, env: Record<string, unknown>) {
					${denoEnvPolyfill()}

					const ip = req.headers.get("CF-Connecting-IP");
					if (!ip) {
						throw new RuntimeError(
							"CANNOT_READ_IP",
							{ cause: "Could not get IP of incoming request" },
						);
					}

					return await handleRequest(RUNTIME, req, {
						remoteAddress: ip,
					});
				}
			}

			// Export durable object binding
			export { __GlobalDurableObject } from "./actor.ts";
			`;
	}

	// Write files
	const distDir = resolve(project.path, "_gen");
	const configPath = genPath(project, RUNTIME_CONFIG_PATH);
	const entrypointPath = genPath(project, ENTRYPOINT_PATH);
	const actorPath = genPath(project, ACTOR_PATH);

	await Deno.mkdir(distDir, { recursive: true });
	await Deno.writeTextFile(configPath, configSource);
	await Deno.writeTextFile(entrypointPath, entrypointSource);
	await Deno.writeTextFile(actorPath, actorSource);
	await Deno.writeTextFile(
		genPath(project, GITIGNORE_PATH),
		".",
	);
	await Deno.writeTextFile(actorPath, actorSource);

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

		// Generate script configs
		modConfig += "scripts: {";
		for (const script of mod.scripts.values()) {
			const runIdent = `modules$$${mod.name}$$${script.name}$$run`;

			modImports += `import { run as ${runIdent} } from '${mod.path}/scripts/${script.name}.ts';\n`;

			modConfig += `${JSON.stringify(script.name)}: {`;
			modConfig += `run: ${runIdent},`;
			modConfig += `public: ${JSON.stringify(script.config.public ?? false)},`;
			modConfig += `requestSchema: ${JSON.stringify(script.requestSchema)},`;
			modConfig += `responseSchema: ${JSON.stringify(script.responseSchema)},`;
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
			modConfig += `storageId: ${JSON.stringify(actor.config.storage_id)},`;
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
			const prismaImportName = `prisma$$${mod.name}`;
			const prismaImportPath = genPrismaOutputBundle(project, mod);
			modImports += `import ${prismaImportName} from ${JSON.stringify(prismaImportPath)};\n`;

			modConfig += `db: {`;
			modConfig += `name: ${JSON.stringify(mod.db.name)},`;
			modConfig += `createPrisma: ${generateDbDriver(opts, prismaImportName)}`;
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

function generateDbDriver(opts: BuildOpts, prismaImportName: string) {
	let dbDriver = "";

	if (opts.dbDriver == DbDriver.NodePostgres) {
		dbDriver += `(url: string) => {
			const pgPool = new pg.Pool({ connectionString: url });
			const adapter = new PrismaPg(pgPool);
			const prisma = new ${prismaImportName}.PrismaClient({
				adapter,
				log: ['query', 'info', 'warn', 'error'],
			});
			return { prisma, pgPool };
		},`;
		dbDriver += `},`;
	} else if (opts.dbDriver == DbDriver.NeonServerless) {
		dbDriver += `(url: string) => {
			const client = neon.neon(url);
			const adapter = new PrismaNeonHTTP(client);
			const prisma = new ${prismaImportName}.PrismaClient({
				adapter,
				log: ['query', 'info', 'warn', 'error'],
			});
			return { prisma, pgPool: undefined };
		},`;
		dbDriver += `},`;
	}

	return dbDriver;
}

function denoEnvPolyfill() {
	// Deno env polyfill
	return dedent`
		globalThis.Deno = {
			env: {
				get(name: string): unknown | undefined {
					return env.hasOwnProperty(name) ? env[name] : undefined;
				},
				set() {
					throw new RuntimeError("UNIMPLEMENTED", {
						cause: "Deno.env.set is unimplemented in Cloudflare Workers"
					});
				},
				delete() {
					throw new RuntimeError("UNIMPLEMENTED", {
						cause: "Deno.env.delete is unimplemented in Cloudflare Workers"
					});
				},
				has(name: string): boolean {
					return env.hasOwnProperty(name);
				},
				toObject(): { [k:string]: string; } {
					return Object.fromEntries(
						Object.entries(env as { [k: string]: string; })
							.filter(([k, v]) => typeof v === 'string')
						);
				}
			}
		} as any;
	`;
}
