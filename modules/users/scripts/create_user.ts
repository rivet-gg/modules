import { ScriptContext } from "../_gen/scripts/create_user.ts";
import { User } from "../utils/types.ts";

export interface Request {
	username?: string;
}

export interface Response {
	user: User;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	await ctx.modules.rateLimit.throttle({ requests: 2, period: 5 * 60 });

	// Create user
	const user = await ctx.db.user.create({
		data: {
			username: req.username ?? generateUsername(),
		},
	});

	return {
		user,
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
