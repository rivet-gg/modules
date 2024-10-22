import { ScriptContext, Database, Query } from "../module.gen.ts";

export interface Request {
	userId: string;
}

export interface Response {
    meta?: {
        initializedAt: string;
        updatedAt: string;
    };
};

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Check if the user exists before hashing the password to save compute
    // resources
    const [user] = await ctx.db.select().from(Database.passwords).where(Query.eq(Database.passwords.userId, req.userId));

    if (!user) return {};
    return {
        meta: {
            initializedAt: new Date(user.createdAt).toISOString(),
            updatedAt: new Date(user.updatedAt).toISOString(),
        },
    }
}
