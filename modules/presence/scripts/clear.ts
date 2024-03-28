import { ScriptContext, RuntimeError } from "../_gen/scripts/clear.ts";

export interface Request {
	identityId: string;
	gameId: string;

	errorIfNotPresent?: boolean;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const value = await ctx.db.presence.updateMany({
		where: {
			identityId: req.identityId,
			gameId: req.gameId,
		},
		data: {
			removedAt: new Date().toISOString(),
			expires: null,
		},
	});

	if (value.count === 0) {
		throw new RuntimeError(
			"presence_not_found",
			{ cause: `Presence not found for identity ${req.identityId} and game ${req.gameId}` },
		);
	}

	return {};
}

