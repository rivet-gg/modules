import { ScriptContext } from "../_gen/scripts/clear_all_game.ts";

export interface Request {
	gameId: string;
}

export interface Response {
    cleared: number;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { count: cleared } = await ctx.db.presence.updateMany({
		where: {
			gameId: req.gameId,
		},
		data: {
			removedAt: new Date().toISOString(),
			expires: null,
		},
	});

	return { cleared };
}
