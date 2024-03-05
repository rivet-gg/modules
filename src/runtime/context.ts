import { Runtime } from "./runtime.ts";
import { Trace } from "./trace.ts";
import { RuntimeError } from "./error.ts";
import { appendTraceEntry } from "./trace.ts";
import { buildRegistryProxy } from "./proxy.ts";
import { BaseRegistryBounds, RegistryCallFn } from "../types/registry.ts";
import { CamelifyRegistry } from "../types/case_conversions.ts";

export class Context<Registry> {
	public constructor(
		protected readonly runtime: Runtime<Registry>,
		public readonly trace: Trace,
	) {}

	protected isAllowedModuleName(_moduleName: string): boolean {
		return true;
	}

	public call: RegistryCallFn<Context<Registry>, Registry> = async function (
		moduleName,
		scriptName,
		req,
	) {
		console.log(
			`Request ${moduleName}.${scriptName}:\n${JSON.stringify(req, null, 2)}`,
		);

		try {
			// Check if calling module is allowed to call target module
			if (!this.isAllowedModuleName(moduleName)) {
				throw new RuntimeError(
					"CANNOT_ACCESS_MODULE",
					{ cause: `Module \`${moduleName}\` is not a dependency` },
				);
			}

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

			return res as any;
		} catch (cause) {
			console.warn(
				`Failed to execute script: ${moduleName}.${scriptName}`,
				cause,
			);
			throw cause;
		}
	};

	public get modules() {
		return buildRegistryProxy<CamelifyRegistry<Registry> & BaseRegistryBounds>(
			this.runtime.config.modules,
			this,
		);
	}

	public async tryCallRaw(
		moduleName: string,
		scriptName: string,
		req: unknown,
	): Promise<object | null> {
		// Lookup module
		const module = this.runtime.config.modules[moduleName];
		if (!module) return null;

		// Lookup script
		const script = module.scripts[scriptName];
		if (!script) return null;

		return await this.call(moduleName as any, scriptName as any, req as any);
	}

	public canCall(
		moduleName: string,
		scriptName: string,
		req?: unknown,
	): boolean {
		// Lookup module
		const module = this.runtime.config.modules[moduleName];
		if (!module) return false;

		// Lookup script
		const script = module.scripts[scriptName];
		if (!script) return false;

		const validateRequest = this.runtime.ajv.compile(script.requestSchema);
		if (req && !validateRequest(req)) return false;

		return true;
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
export class ModuleContext<RegistryT, TDatabase> extends Context<RegistryT> {
	public constructor(
		runtime: Runtime<RegistryT>,
		trace: Trace,
		public readonly moduleName: string,
		public readonly db: TDatabase,
	) {
		super(runtime, trace);
	}

	protected isAllowedModuleName(targetModuleName: string): boolean {
		return this.runtime.config
			.modules[this.moduleName]
			?.dependencies
			.has(targetModuleName);
	}
}

/**
 * Context for a script.
 */
export class ScriptContext<RegistryT, TDatabase>
	extends ModuleContext<RegistryT, TDatabase> {
	public constructor(
		runtime: Runtime<RegistryT>,
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
export class TestContext<RegistryT, TDatabase>
	extends ModuleContext<RegistryT, TDatabase> {}
