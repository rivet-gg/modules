import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { ALGORITHM_DEFAULT, Algorithm, hash } from "../utils/common.ts";

export interface Request {
	userId: string;
    newPassword: string;
    newAlgorithm?: Algorithm;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Ensure the user exists before hashing the password to save compute
    // resources
    const user = await ctx.db.passwords.findFirst({
        where: {
            userId: req.userId,
        },
    });
    if (!user) {
        throw new RuntimeError("user_does_not_have_password");
    }

    // Hash the password
    const algo = req.newAlgorithm || ALGORITHM_DEFAULT;
    const passwordHash = await hash(req.newPassword, algo);

    // Update the entry for the user's password
    await ctx.db.passwords.update({
        where: {
            userId: req.userId,
        },
        data: {
            passwordHash,
            algo,
        },
    });

    return {};
}
