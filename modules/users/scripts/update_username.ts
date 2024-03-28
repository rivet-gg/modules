import { ScriptContext, RuntimeError } from "../_gen/scripts/update_username.ts";
import { User } from "../utils/types.ts";

export interface Request {
    userToken: string;
	username: string;
}

export interface Response {
	user: User;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({ requests: 2, period: 5 * 60 });

    // Authenticate user
    const { userId } = await ctx.modules.users.authenticateUser({ userToken: req.userToken });

    const user = await ctx.db.$transaction(async (db) => {
        const userPrevState = await db.user.findFirst({
            where: {
                id: userId,
            },
        });

        if (!userPrevState) {
            throw new RuntimeError("INTERNAL_ERROR", { cause: `User token validated but user doesn't exist` });
        }

        if (userPrevState.username === req.username) {
            return userPrevState;
        }

        const user = await db.user.update({
            where: {
                id: userId,
            },
            data: {
                username: req.username,
                updatedAt: new Date(),
            }
        });

        return user;
    });

	return { user };
}
