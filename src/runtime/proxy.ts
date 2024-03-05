import { Context, Module } from "../runtime/mod.ts";
import { RequestOf } from "../types/registry.ts";
import { ResponseOf } from "../types/registry.ts";

import { snakeCase } from "https://deno.land/x/case@2.2.0/mod.ts";


/**
 * Typed module accessor
 */
type MappedProxy<RegistryT> = Readonly<{
	[K in keyof RegistryT]: MappedModuleProxy<RegistryT, K>;
}>;
type MappedNullProxy<RegistryT> = {
	[K in keyof RegistryT]: null;
};

/**
 * Typed module-specific script accessor
 */
type MappedModuleProxy<RegistryT, Module extends keyof RegistryT> = Readonly<{
	[K in keyof RegistryT[Module]]: (
		request: RequestOf<RegistryT[Module][K]>,
	) => Promise<ResponseOf<RegistryT[Module][K]>>;
}>;
type MappedModuleNullProxy<RegistryT, Module extends keyof RegistryT> = {
	[K in keyof RegistryT[Module]]: null;
};

const snakeToCamelCache: Record<string, string | undefined> = {};
const camelToSnakeCache: Record<string, string | undefined> = {};
const toSnakeCached = (s: string) => {
	const cached = camelToSnakeCache[s];
	if (cached) return cached;

	const output = snakeCase(s);
	camelToSnakeCache[s] = output;

	return output;
};
const toCamelCached = (s: string) => {
	const cached = snakeToCamelCache[s];
	if (cached) return cached;

	const output = s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
	snakeToCamelCache[s] = output;

	return output;
};


/**
 * Builds a proxy for the entire registry, with the keys of the modules mapped
 * to script proxies using [`buildModuleProxy`]({@link buildModuleProxy})
 */
export function buildRegistryProxy<RegistryT>(
	modules: Record<string, Module>,
	ctx: Context<RegistryT>,
): MappedProxy<RegistryT> {
	/**
	 * Proxies require the accessed key on the object to be defined, so we
	 * create this object with all the module names mapped to null.
	 */
	const target: MappedNullProxy<RegistryT> = {} as any;
	for (const k of Object.keys(modules)) {
		// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
		// target[k as keyof RegistryT] = null;
		(target as any)[toCamelCached(k)] = null;
	}

	/**
	 * A handler object that will return a proxy for the accessed module.
	 *
	 * Object.hasOwn is used here to default to `undefined` just in case the
	 * object is somehow improperly accessed.
	 */
	const handler: ProxyHandler<MappedProxy<RegistryT>> = {
		get: function (_, property) {
			if (modules[toSnakeCached(property as string) as keyof typeof modules]) {
				return buildModuleProxy(
					modules,
					ctx,
					property as keyof RegistryT & string,
				);
			}
		},
	};

	// Create and return the proxy with the keys of the modules, with
	// accesses being intercepted and mapped by the proxy handler.
	//
	// `target as unknown as MappedProxy` is used to bypass the type check
	// because null (typeof target[moduleName]) is not a sub or super type
	// of `MappedModuleProxy<T>`.
	return new Proxy(target as unknown as MappedProxy<RegistryT>, handler);
}

/**
 * Builds a proxy for a specific module (`ModuleName`), with the keys of the
 * scripts mapped to on-the-fly generated call functions
 */
function buildModuleProxy<
	RegistryT,
	ModuleName extends keyof RegistryT & string,
>(
	modules: Record<string, Module>,
	ctx: Context<RegistryT>,
	moduleName: ModuleName,
): MappedModuleProxy<RegistryT, ModuleName> {
	// Although this should never throw an error, double-checking never hurt anyone
	const accessedModule = modules[toSnakeCached(moduleName)] as Module | undefined;
	if (!accessedModule) throw new Error(`Module not found: ${moduleName}`);

	/**
	 * Proxies require the accessed key on the object to be defined, so we
	 * create this object with all the script names in module `ModuleName`
	 * mapped to null.
	 */
	const target: MappedModuleNullProxy<RegistryT, ModuleName> = {} as any;
	for (const k of Object.keys(accessedModule.scripts)) {
		// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
		// target[k as keyof RegistryT[ModuleName]] = null;
		(target as any)[toCamelCached(k)] = null;
	}

	/**
	 * A handler object that will return a bound call function for the
	 * accessed script.
	 *
	 * Object.hasOwn is used here to default to `undefined` just in case the
	 * object is somehow improperly accessed.
	 */
	const handler: ProxyHandler<MappedModuleProxy<RegistryT, ModuleName>> = {
		get: function (_, property) {
			if (Object.hasOwn(accessedModule.scripts, toSnakeCached(property as string))) {
				return (req: unknown) =>
					ctx.call(
						toSnakeCached(moduleName) as ModuleName,
						toSnakeCached(property as string) as keyof RegistryT[ModuleName] & string,
						req as any,
					);
			}
		},
	};

	// Create and return the proxy with the keys of the scripts, with
	// accesses being intercepted and mapped by the proxy handler, returning
	// prebound and typed call functions.
	//
	// `target as unknown as MappedModuleProxy<ModuleName>` is again used to
	// bypass the type check because null (typeof target[scriptName]) is not
	// a sub or super type of `(req: Promise<unknown>) => Promise<unknown>`.
	return new Proxy(
		target as unknown as MappedModuleProxy<RegistryT, ModuleName>,
		handler,
	);
}
