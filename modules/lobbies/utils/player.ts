import { ScriptContext } from "../module.gen.ts";

export type PlayerRequest = Record<never, never>;

export interface PlayerResponse {
	id: string;
}

export interface PlayerResponseWithToken extends PlayerResponse {
	token: string;
}

export async function buildPlayerResponseWithToken(
	ctx: ScriptContext,
	player: PlayerResponse,
): Promise<PlayerResponseWithToken> {
	const { token } = await ctx.modules.tokens.create({
		type: "player",
		meta: { playerId: player.id },
	});
	return { ...player, token: token.token };
}
