import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
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
    await ctx.modules.rateLimit.throttle({
        key: req.userId,
        period: 10,
        requests: 10,
        type: "user",
    });

    // Look up the user password hash
    const user = await ctx.db.passwords.findFirst({
        where: {
            userId: req.userId,
        },
        select: {
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
