export type ReqOf<T> = T extends (req: infer Req) => Promise<infer Res> ? Req : never;
export type ResOf<T> = T extends (req: infer Req) => Promise<infer Res> ? Res : never;
