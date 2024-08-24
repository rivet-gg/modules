import { Empty, RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";
import { Algorithm, hashMatches } from "../utils/common.ts";

export interface Request {
	userId: string;
    password: string;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Look up the user password hash
    const user = await ctx.db.query.passwords.findFirst({
        where: Query.eq(Database.passwords.userId, req.userId),
        columns: {
            algo: true,
            passwordHash: true,
        }
    });
    if (!user) throw new RuntimeError("user_does_not_have_password");

    // Verify the passwordHash
    const passwordMatches = await hashMatches(
        req.password,
        user.passwordHash,
        user.algo as Algorithm,
    );

    if (!passwordMatches) throw new RuntimeError("password_invalid");

    return {};
}
