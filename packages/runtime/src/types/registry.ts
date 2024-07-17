export type BaseRegistryBounds = Record<any, Record<any, { request: any; response: any }>>;

export type RequestOf<T> = T extends { request: any } ? T["request"] : never;
export type ResponseOf<T> = T extends { response: any } ? T["response"] : never;

export type DependencyScriptCallFunction<ThisType, Dependencies> = <
	M extends keyof Dependencies & string,
	S extends keyof Dependencies[M] & string,
>(
	this: ThisType,
	module: M,
	script: S,
	req: RequestOf<Dependencies[M][S]>,
) => Promise<ResponseOf<Dependencies[M][S]>>;
