import { Context } from "../runtime/mod.ts";
import { RequestOf, ResponseOf } from "../types/registry.ts";

type AnyScriptName<RegistryT, Key extends keyof RegistryT> = keyof RegistryT[Key];
type AnyPair<RegistryT> = {
	[Key in keyof RegistryT]: readonly [Key, AnyScriptName<RegistryT, Key>];
}[keyof RegistryT];

export type MapFrom<Reg1, Reg2> = {
	[Mod in keyof Reg1]: {
		[Script in keyof Reg1[Mod]]: AnyPair<Reg2>;
	};
};

export type CallableRegistry<RegistryT> = {
	[Mod in keyof RegistryT]: {
		[Script in keyof RegistryT[Mod]]: (
			req: RequestOf<RegistryT[Mod][Script]>,
		) => Promise<ResponseOf<RegistryT[Mod][Script]>>;
	};
};

export function buildRegistryProxy<RegistryT, RegistryCamelT>(
	ctx: Context<RegistryT, RegistryCamelT>,
	map: MapFrom<RegistryCamelT, RegistryT>,
): CallableRegistry<RegistryCamelT> {
	const handler = {
		get: (_target: unknown, moduleProp: string) => {
			if (moduleProp in map) {
				const moduleMap = map[moduleProp as keyof typeof map];

				return new Proxy(moduleMap, {
					get: (_target: unknown, scriptProp: string) => {
						if (scriptProp in moduleMap) {
							const pair = moduleMap[scriptProp as keyof typeof moduleMap];
							return (req: unknown) => {
								return ctx.call(
									pair[0] as any,
									pair[1] as any,
									req as any,
								);
							};
						}
					},
				});
			}
		},
	};
	return new Proxy({}, handler) as CallableRegistry<RegistryCamelT>;
}
