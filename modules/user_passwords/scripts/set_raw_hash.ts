import { Empty, RuntimeError, ScriptContext, Query, Database } from "../module.gen.ts";
import { ALGORITHM_DEFAULT, Algorithm, hash } from "../utils/common.ts";

export interface Request {
	userId: string;
    newHash: string;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Update/insert the entry for the user's password
    await ctx.db.insert(Database.passwords)
        .values({
            userId: req.userId,
            passwordHash: req.newHash,
            algo: ALGORITHM_DEFAULT,
            updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
            target: Database.passwords.userId,
            set: {
                passwordHash: req.newHash,
                algo: ALGORITHM_DEFAULT,
                updatedAt: new Date().toISOString(),
            }
        });

    return {};
}
