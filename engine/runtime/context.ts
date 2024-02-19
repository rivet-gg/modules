import { Runtime } from "./runtime.ts";
import { Trace } from "./trace.ts";
import { RuntimeError } from "./error.ts";
import { appendTraceEntry } from "./trace.ts";

export class Context {
	public constructor(
		protected readonly runtime: Runtime,
		public readonly trace: Trace,
	) {}

	public async call(
		moduleName: string,
		scriptName: string,
		req: unknown,
	): Promise<unknown> {
		console.log(
			`Request ${moduleName}.${scriptName}:\n${JSON.stringify(req, null, 2)}`,
		);

		try {
			// Lookup module
			const module = this.runtime.config.modules[moduleName];
			if (!module) throw new Error(`Module not found: ${moduleName}`);

			// Lookup script
			const script = module.scripts[scriptName];
			if (!script) throw new Error(`Script not found: ${scriptName}`);

			// Build context
			const ctx = new ScriptContext(
				this.runtime,
				appendTraceEntry(this.trace, {
					script: { module: moduleName, script: scriptName },
				}),
				moduleName,
				this.runtime.postgres.getOrCreatePool(module)?.prisma,
				scriptName,
			);

			// Compile schemas
			const validateRequest = this.runtime.ajv.compile(script.requestSchema);
			const validateResponse = this.runtime.ajv.compile(script.responseSchema);

			// Validate request
			if (!validateRequest(req)) {
				throw new Error(
					`Invalid request: ${JSON.stringify(validateRequest.errors)}`,
				);
			}

			// Execute script
			const res = await ctx.runBlock(async () => await script.run(ctx, req));
			console.log(
				`Response ${moduleName}.${scriptName}:\n${
					JSON.stringify(res, null, 2)
				}`,
			);

			// Validate response
			if (!validateResponse(res)) {
				throw new Error(
					`Invalid response: ${JSON.stringify(validateResponse.errors)}`,
				);
			}

			return res;
		} catch (cause) {
			console.warn(
				`Failed to execute script: ${moduleName}.${scriptName}`,
				cause,
			);
			throw cause;
		}
	}

	/**
	 * Runs a block of code and catches any related errors.
	 */
	public async runBlock<Res>(fn: () => Promise<Res>) {
		try {
			return await fn();
		} catch (cause) {
			// Convert error to RuntimeError. Enrich with context.
			if (cause instanceof RuntimeError) {
				cause.enrich(this.runtime, this);
				throw cause;
			} else {
				const error = new RuntimeError("INTERNAL_ERROR", { cause });
				error.enrich(this.runtime, this);
				throw error;
			}
		}
	}
}

/**
 * Context for a module.
 */
export class ModuleContext<TDatabase> extends Context {
	public constructor(
		runtime: Runtime,
		trace: Trace,
		public readonly moduleName: string,
		public readonly db: TDatabase,
	) {
		super(runtime, trace);
	}
}

/**
 * Context for a script.
 */
export class ScriptContext<TDatabase> extends ModuleContext<TDatabase> {
	public constructor(
		runtime: Runtime,
		trace: Trace,
		moduleName: string,
		db: TDatabase,
		public readonly scriptName: string,
	) {
		super(runtime, trace, moduleName, db);
	}
}

/**
 * Context for a test.
 */
export class TestContext<TDatabase> extends ModuleContext<TDatabase> {}
