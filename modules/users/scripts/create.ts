import { ScriptContext, Database } from "../module.gen.ts";
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
	await ctx.modules.rateLimit.throttlePublic({ requests: 2, period: 5 * 60 });

	// Create user
  const rows = await ctx.db.insert(Database.users)
    .values({
      username: req.username ?? generateUsername(),
    })
    .returning();

	return {
		user: rows[0]!,
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
