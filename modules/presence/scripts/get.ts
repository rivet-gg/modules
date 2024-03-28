import { RuntimeError } from "../../auth/_gen/mod.ts";
import { ScriptContext } from "../_gen/scripts/get_by_game.ts";
import { prismaToOutput } from "../utils/types.ts";
import { Presence } from "../utils/types.ts";

export interface Request {
    gameId: string;
    identityId: string;
}

export interface Response {
    presence: Presence;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const presence = await ctx.db.presence.findFirst({
        where: {
            gameId: req.gameId,
            identityId: req.identityId,
            removedAt: null,
            OR: [
                { expires: { gt: new Date().toISOString() } },
                { expires: null },
            ],
        },
    });

    if (!presence) {
        throw new RuntimeError(
            "presence_not_found",
			{ cause: `Presence not found for identity ${req.identityId} and game ${req.gameId}` },
        );
    }

	return { presence: prismaToOutput(presence) };
}
