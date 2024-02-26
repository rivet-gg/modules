// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
// import type {
// 	Registry as RegistryType,
// 	RequestOf,
// 	ResponseOf,
// } from "@ogs/helpers/registry.d.ts";
import { Context, Module } from "./mod.ts";

// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
type RegistryType = unknown;
type RequestOf<T> = unknown;
type ResponseOf<T> = unknown;

/**
 * Typed module accessor
 */
type MappedProxy = Readonly<
	{
		[K in keyof RegistryType]: MappedModuleProxy<K>;
	}
>;
type MappedNullProxy = {
	[K in keyof RegistryType]: null;
};

/**
 * Typed module-specific script accessor
 */
type MappedModuleProxy<Module extends keyof RegistryType> = Readonly<
	{
		[K in keyof RegistryType[Module]]: (
			request: RequestOf<RegistryType[Module][K]>,
		) => Promise<ResponseOf<RegistryType[Module][K]>>;
	}
>;
type MappedModuleNullProxy<Module extends keyof RegistryType> = {
	[K in keyof RegistryType[Module]]: null;
};

/**
 * Builds a proxy for the entire registry, with the keys of the modules mapped
 * to script proxies using [`buildModuleProxy`]({@link buildModuleProxy})
 */
export function buildRegistryProxy(
	modules: Record<string, Module>,
	ctx: Context,
): MappedProxy {
	/**
	 * Proxies require the accessed key on the object to be defined, so we
	 * create this object with all the module names mapped to null.
	 */
	const target: MappedNullProxy = {} as any;
	for (const k of Object.keys(modules)) {
		// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
		// target[k as keyof RegistryType] = null;
		(target as any)[k] = null;
	}

	/**
	 * A handler object that will return a proxy for the accessed module.
	 *
	 * Object.hasOwn is used here to default to `undefined` just in case the
	 * object is somehow improperly accessed.
	 */
	const handler: ProxyHandler<MappedProxy> = {
		get: function (_, property) {
			if (Object.hasOwn(modules, property as string)) {
				return buildModuleProxy(
					modules,
					ctx,
					property as keyof RegistryType,
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
	return new Proxy(target as unknown as MappedProxy, handler);
}

/**
 * Builds a proxy for a specific module (`ModuleName`), with the keys of the
 * scripts mapped to on-the-fly generated call functions
 */
function buildModuleProxy<ModuleName extends keyof RegistryType & string>(
	modules: Record<string, Module>,
	ctx: Context,
	moduleName: ModuleName,
): MappedModuleProxy<ModuleName> {
	// Although this should never throw an error, double-checking never hurt anyone
	const accessedModule = modules[moduleName] as Module | undefined;
	if (!accessedModule) throw new Error(`Module not found: ${moduleName}`);

	/**
	 * Proxies require the accessed key on the object to be defined, so we
	 * create this object with all the script names in module `ModuleName`
	 * mapped to null.
	 */
	const target: MappedModuleNullProxy<ModuleName> = {} as any;
	for (const k of Object.keys(accessedModule.scripts)) {
		// TODO: https://github.com/rivet-gg/open-game-services-engine/issues/79
		// target[k as keyof RegistryType[ModuleName]] = null;
		(target as any)[k] = null;
	}

	/**
	 * A handler object that will return a bound call function for the
	 * accessed script.
	 *
	 * Object.hasOwn is used here to default to `undefined` just in case the
	 * object is somehow improperly accessed.
	 */
	const handler: ProxyHandler<MappedModuleProxy<ModuleName>> = {
		get: function (_, property) {
			if (Object.hasOwn(accessedModule.scripts, property as string)) {
				return (req: unknown) =>
					ctx.call(
						moduleName as ModuleName,
						property as keyof RegistryType[ModuleName] & string,
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
		target as unknown as MappedModuleProxy<ModuleName>,
		handler,
	);
}
