// import { module } from '../module.ts';
// import { z } from 'https://deno.land/x/zod@3.22.4/mod.ts';

// // Problems:
// // 1. How do we look up the req/res types to generate zod?
// // 2. We have to define the script name 3 times (not 2) now (i.e. createScript('xxxx'), import './scripts/xxxx.ts', and the filename itself)

// module.createScript('get', async (ctx, req) => {
//     const users = await ctx.db.query.users.findMany();
//     return { users };
// });
// ///


// // ts-to-zod

// /// 1.
// module.createScript('get', {request}, async (ctx, req) => {
//     const users = await ctx.db.query.users.findMany();
//     return { users };
// });
// // or
// module.createScript('get', {request}).handle(async (ctx, req) => {
//     const users = await ctx.db.query.users.findMany();
//     return { users };
// });
// // or
// module.createScript('get')
//     .request(request)
//     .handle(async (ctx, req) => {
//     const users = await ctx.db.query.users.findMany();
//     return { users };
// });

// ScriptContext = Context<MyModule>

interface Request {
    userId: string;
}

interface Response {

}

// export const get = script<Request>(async (ctx, req) => {
//     const users = await ctx.db.query.users.findMany();
//     return { users };
// });

export function run(ctx: ScriptContext, req: Request): Promise<Response> {
    return ctx.db.sql`SELECT * FROM users WHERE id = ${req.userId}`;
}
