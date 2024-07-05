import { Empty, RuntimeError, ScriptContext } from "../module.gen.ts";
import { ALGORITHM_DEFAULT, Algorithm, hash } from "../utils/common.ts";

export interface Request {
	userId: string;
    password: string;
    algorithm?: Algorithm;
}

export type Response = Empty;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Check if the user exists before hashing the password to save compute
    // resources
    const user = await ctx.db.passwords.findFirst({
        where: {
            userId: req.userId,
        },
    });
    if (user) {
        throw new RuntimeError("user_already_has_password");
    }

    // Hash the password
    const algo = req.algorithm || ALGORITHM_DEFAULT;
    const passwordHash = await hash(req.password, algo);

    // Create an entry for the user's password
    await ctx.db.passwords.create({
        data: {
            userId: req.userId,
            passwordHash,
            algo,
        },
    });

    return {};
}
