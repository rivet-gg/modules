import type {
	Registry as RegistryType,
	RequestOf,
	ResponseOf,
} from "@ogs/helpers/registry.d.ts";
import { Context, Module } from "@ogs/runtime";

type MappedProxy = {
	[K in keyof RegistryType]: MappedModuleProxy<K>;
};
type MappedNullProxy = {
	[K in keyof RegistryType]: null;
};

type MappedModuleProxy<Module extends keyof RegistryType> = {
	[K in keyof RegistryType[Module]]: (
		request: RequestOf<RegistryType[Module][K]>,
	) => Promise<ResponseOf<RegistryType[Module][K]>>;
};
type MappedModuleNullProxy<Module extends keyof RegistryType> = {
	[K in keyof RegistryType[Module]]: null;
};

export class BaseModuleProxyBuilder {
	public static buildProxyForRegistry(
		modules: Record<string, Module>,
		ctx: Context,
	) {
		const target: MappedNullProxy = {} as any;
		for (const k of Object.keys(modules)) {
			target[k as keyof RegistryType] = null;
		}

		const handler: ProxyHandler<MappedProxy> = {
			get: function (_, property) {
				if (Object.hasOwn(modules, property as string)) {
					return ModuleProxyBuilder.buildProxyForRegistry(
						modules,
						ctx,
						property as keyof RegistryType,
					);
				}
			},
		};

		return new Proxy(target as unknown as MappedProxy, handler);
	}
}

class ModuleProxyBuilder {
	public static buildProxyForRegistry<
		ModuleName extends keyof RegistryType & string,
	>(
		modules: Record<string, Module>,
		ctx: Context,
		moduleName: ModuleName,
	) {
		const accessedModule = modules[moduleName];
		if (!accessedModule) throw new Error(`Module not found: ${moduleName}`);

		const target: MappedModuleNullProxy<ModuleName> = {} as any;
		for (const k of Object.keys(accessedModule.scripts)) {
			target[k as keyof RegistryType[ModuleName]] = null;
		}

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

		return new Proxy(
			target as unknown as MappedModuleProxy<ModuleName>,
			handler,
		);
	}
}
