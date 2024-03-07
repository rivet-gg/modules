export type BaseRegistryBounds = Record<any, Record<any, { request: any; response: any }>>;

export type RequestOf<T> = T extends { request: any } ? T["request"] : never;
export type ResponseOf<T> = T extends { response: any } ? T["response"] : never;

export type RegistryCallFn<ThisType, Registry> = <
	M extends keyof Registry & string,
	S extends keyof Registry[M] & string,
>(
	this: ThisType,
	module: M,
	script: S,
	req: RequestOf<Registry[M][S]>,
) => Promise<ResponseOf<Registry[M][S]>>;
