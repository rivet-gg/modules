import { ScriptContext, Query, Database } from "../module.gen.ts";

export interface Request {
	matchId: string;
}

export type Response = { settings: any };

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
	const data = await ctx.db.query.blumintMatches.findFirst({
		where: Query.eq(Database.blumintMatches.id, req.matchId),
		columns: {
			settings: true
		}
	});
	if (!data) {
		throw new Error("Match not found");
	}

	return { settings: data.settings };
}