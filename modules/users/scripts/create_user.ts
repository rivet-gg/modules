import { ScriptContext } from "../module.gen.ts";
import { User } from "../utils/types.ts";

export interface Request {
	username?: string;
}

export interface Response {
	user: Omit<User, "profilePictureUrl">;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttlePublic({ requests: 2, period: 5 * 60 });

	// Create user
	const user = await ctx.db.user.create({
		data: {
			username: req.username ?? generateUsername(),
		},
		select: {
			id: true,
			username: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return {
		user: user,
	};
}

function generateUsername() {
	let username = "Player ";
	for (let i = 0; i < 10; i++) {
		const random = Math.floor(Math.random() * 10);
		username += random;
	}
	return username;
}
