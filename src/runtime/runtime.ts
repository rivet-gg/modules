import { ModuleContextParams, ScriptContext } from "./context.ts";
import { Context, TestContext } from "./context.ts";
import { PgPoolDummy, Postgres, PrismaClientDummy } from "./postgres.ts";
import { handleRequest } from "./server.ts";
import { TraceEntryType } from "./trace.ts";
import { newTrace } from "./trace.ts";
import { RegistryCallMap } from "./proxy.ts";
import { ActorDriver } from "./actor/driver.ts";
import { ActorBase } from "./actor/actor.ts";
import { ContextParams } from "./mod.ts";
import { errorToLogEntries, log } from "./logger.ts";

interface ParseSuccessResult<Output = unknown> {
	success: true;
	data: Output;
	error?: never;
}

interface ParseErrorResult {
	success: false;
	error: Error;
	data?: never;
}

interface ValidationSchema {
	safeParseAsync: <Output = unknown>(
		data: unknown,
	) => Promise<
		ParseSuccessResult<Output> | ParseErrorResult
	>;
}

export interface Config {
	runtime: BuildRuntime;
	modules: Record<string, Module>;
	cors?: CorsConfig;
	db: {
		createPgPool: (url: URL) => PgPoolDummy;
	};
}

/**
 * Which runtime to target when building.
 */
export enum BuildRuntime {
	Deno,
	Cloudflare,
}

export interface Module {
	storageAlias: string;
	scripts: Record<string, Script>;
	actors: Record<string, Actor>;
	errors: Record<string, ErrorConfig>;
	db?: {
		/** Name of the Postgres schema the tables live in. */
		schema: string;
		createPrismaClient: (pool: PgPoolDummy, schema: string) => PrismaClientDummy;
	};
	dependencies: Set<string>;
	userConfig: unknown;
}

export interface CorsConfig {
	origins: Set<string>;
}

export interface Script {
	// deno-lint-ignore no-explicit-any
	run: ScriptRun<any, any, any, any, any>;
	requestSchema: ValidationSchema;
	responseSchema: ValidationSchema;
	public: boolean;
}

export type ScriptRun<Req, Res, UserConfigT, DatabaseT, DatabaseSchemaT> = (
	ctx: ScriptContext<{
		dependenciesSnake: any;
		dependenciesCamel: any;
		actorsSnake: any;
		actorsCamel: any;
		userConfig: UserConfigT;
		database: DatabaseT;
		databaseSchema: DatabaseSchemaT;
	}>,
	req: Req,
) => Promise<Res>;

export interface Actor {
	// This monstrosity is to allow passing the constructor a subclass of ActorBase.
	actor: new (
		...args: ConstructorParameters<typeof ActorBase<unknown, unknown>>
	) => ActorBase<unknown, unknown>;
	storageAlias: string;
}

export interface ErrorConfig {
	description?: string;
}

export class Runtime<Params extends ContextParams> {
	public postgres: Postgres;

	public hostname = Deno.env.get("OPENGB_HOSTNAME") ?? "127.0.0.1";
	public port = parseInt(Deno.env.get("OPENGB_PORT") ?? "6420");
	public publicEndpoint: string;

	public constructor(
		public config: Config,
		public actorDriver: ActorDriver,
		private dependencyCaseConversionMap: RegistryCallMap,
		private actorDependencyCaseConversionMap: RegistryCallMap,
	) {
		this.publicEndpoint = Deno.env.get("OPENGB_PUBLIC_ENDPOINT") ?? `http://${this.hostname}:${this.port}`;

		this.postgres = new Postgres();
	}

	private async shutdown() {
		await this.postgres.shutdown();
	}

	public createRootContext(
		traceEntryType: TraceEntryType,
	): Context<{ dependenciesSnake: Params["dependenciesSnake"]; dependenciesCamel: Params["dependenciesCamel"] }> {
		return new Context(
			this,
			newTrace(traceEntryType, this.config.runtime),
			this.dependencyCaseConversionMap,
			this.actorDependencyCaseConversionMap,
		);
	}

	/**
	 * Serves the runtime as an HTTP server.
	 */
	public async serve() {
		await Deno.serve(
			{
				hostname: this.hostname,
				port: this.port,
				onListen: () => {
					log(
						"info",
						"server started",
						["hostname", this.hostname],
						["port", this.port],
						["endpoint", this.publicEndpoint],
					);
				},
			},
			(req, info) => handleRequest(this, req, { remoteAddress: info.remoteAddr.hostname }),
		).finished;
	}

	/**
	 * Registers a module test with the Deno runtime.
	 */
	public static test<Params extends ModuleContextParams>(
		config: Config,
		actorDriver: ActorDriver,
		moduleName: string,
		testName: string,
		fn: (
			ctx: TestContext<Params>,
		) => Promise<void>,
		dependencyCaseConversionMap: RegistryCallMap,
		actorDependencyCaseConversionMap: RegistryCallMap,
	) {
		Deno.test({
			name: testName,

			// TODO: https://github.com/rivet-gg/opengb-engine/issues/35
			sanitizeOps: false,
			sanitizeResources: false,

			async fn() {
				const runtime = new Runtime<Params>(
					config,
					actorDriver,
					dependencyCaseConversionMap,
					actorDependencyCaseConversionMap,
				);

				// Build context
				const module = config.modules[moduleName];
				const ctx = new TestContext<Params>(
					runtime,
					newTrace({
						test: { module: moduleName, name: testName },
					}),
					moduleName,
					runtime.postgres.getOrCreatePrismaClient(runtime.config, module),
					module.db?.schema,
					dependencyCaseConversionMap,
					actorDependencyCaseConversionMap,
				);

				// Run test
				try {
					await ctx.runBlock(async () => {
						await fn(ctx);
					});
				} catch (cause) {
					log(
						"error",
						"failed to execute test",
						["module", moduleName],
						["test", testName],
						...errorToLogEntries("cause", cause),
					);
					throw cause;
				} finally {
					await runtime.shutdown();
				}
			},
		});
	}

	/**
	 * Only runs on a CORS preflight request— returns a response with the
	 * appropriate CORS headers & status.
	 *
	 * @param req The preflight OPTIONS request
	 * @returns The full response to the preflight request
	 */
	public corsPreflight(req: Request): Response {
		const origin = req.headers.get("Origin");
		if (origin) {
			const normalizedOrigin = new URL(origin).origin;
			if (this.config.cors) {
				if (this.config.cors.origins.has(normalizedOrigin)) {
					return new Response(undefined, {
						status: 204,
						headers: {
							...this.corsHeaders(req),
							"Vary": "Origin",
						},
					});
				}
			}
		}

		// Origin is not allowed/no origin header on preflight
		return new Response(
			JSON.stringify({
				"message": "CORS origin not allowed. See https://opengb.dev/docs/cors",
			}),
			{
				status: 403,
				headers: {
					"Vary": "Origin",
				},
			},
		);
	}

	public corsHeaders(req: Request): Record<string, string> {
		const origin = req.headers.get("Origin");

		// Don't set CORS headers if there's no origin (e.g. a server-side
		// request)
		if (!origin) return {};

		// If the origin is allowed, return the appropriate headers.
		// Otherwise, return a non-matching cors header (empty object).
		if (this.config.cors?.origins.has(origin)) {
			return {
				"Access-Control-Allow-Origin": new URL(origin).origin,
				"Access-Control-Allow-Methods": "*",
				"Access-Control-Allow-Headers": "*",
			};
		} else {
			return {};
		}
	}

	public corsAllowed(req: Request): boolean {
		const origin = req.headers.get("Origin");

		if (!origin) return true;
		return this.config.cors?.origins.has(origin) ?? false;
	}
}
