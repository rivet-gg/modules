import { Context } from "@ogs/runtime";
import { User } from "../schema/common.ts";

export interface Request {
	userIds: string[];
}

export interface Response {
	users: { [id: string]: User };
}

export async function handler(ctx: Context, req: Request): Promise<Response> {
	await ctx.call("rate_limit", "throttle", {});

	const query = await ctx.postgres.run((conn) =>
		conn.queryObject<User>`SELECT * FROM users WHERE id = ANY(${req.userIds})`
	);

	const users: Record<string, User> = {};
	for (const user of query.rows) {
		users[user.id] = user;
	}

	return { users };
}
