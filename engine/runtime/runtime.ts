import { ScriptContext } from "./context.ts";
import { Context, TestContext } from "./context.ts";
import { PrismaClientDummy } from "./postgres.ts";
import { Postgres } from "./postgres.ts";
import { serverHandler } from "./server.ts";
import { TraceEntryType } from "./trace.ts";
import { newTrace } from "./trace.ts";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export interface Config {
	modules: Record<string, Module>;
}

export interface Module {
	scripts: Record<string, Script>;
	errors: Record<string, ErrorConfig>;
	db?: {
		name: string;
		createPrisma: (databaseUrl: string) => CreatePrismaOutput;
	};
}

interface CreatePrismaOutput {
	prisma: PrismaClientDummy;
	pgPool?: any;
}

export interface Script {
	// deno-lint-ignore no-explicit-any
	handler: ScriptHandler<any, any, any>;
	// deno-lint-ignore no-explicit-any
	requestSchema: any;
	// deno-lint-ignore no-explicit-any
	responseSchema: any;
	public: boolean;
}

export type ScriptHandler<Req, Res, TDatabase> = (
	ctx: ScriptContext<TDatabase>,
	req: Req,
) => Promise<Res>;

export interface ErrorConfig {
	description?: string;
}

export class Runtime {
	public postgres: Postgres;

	public ajv: Ajv.default;

	public constructor(public config: Config) {
		this.postgres = new Postgres();

		this.ajv = new Ajv.default({
			removeAdditional: true,
		});
		// TODO: Why are types incompatible
		addFormats.default(this.ajv as any);
	}

	private async shutdown() {
		await this.postgres.shutdown();
	}

	public createRootContext(traceEntryType: TraceEntryType): Context {
		return new Context(this, newTrace(traceEntryType));
	}

	/**
	 * Serves the runtime as an HTTP server.
	 */
	public async serve() {
		const port = parseInt(Deno.env.get("PORT") ?? "8080");
		console.log(`Serving on port ${port}`);
		await Deno.serve({ port }, serverHandler(this)).finished;
	}

	/**
	 * Registers a module test with the Deno runtime.
	 */
	public static test(
		config: Config,
		moduleName: string,
		testName: string,
		fn: (ctx: TestContext<any>) => Promise<void>,
	) {
		Deno.test({
			name: testName,

			// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/35
			sanitizeOps: false,

			async fn() {
				const runtime = new Runtime(config);

				// Build context
				const module = config.modules[moduleName];
				const ctx = new TestContext(
					runtime,
					newTrace({
						test: { module: moduleName, name: testName },
					}),
					moduleName,
					runtime.postgres.getOrCreatePool(module)?.prisma,
				);

				// Run test
				try {
					await ctx.runBlock(async () => {
						await fn(ctx);
					});
				} catch (cause) {
					console.error(
						`Failed to execute test: ${moduleName}.${testName}`,
						cause,
					);
					throw cause;
				} finally {
					await runtime.shutdown();
				}
			},
		});
	}
}
