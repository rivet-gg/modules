import { ScriptContext, RuntimeError } from "../_gen/scripts/extend.ts";
import { prismaToOutput } from "../utils/types.ts";
import { Presence } from "../utils/types.ts";

export interface Request {
    gameId: string;
    identityId: string;

    expiresInMs: number | null;
    reviveIfExpired: boolean;
}

export interface Response {
    presence: Presence
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { presence } = await ctx.db.$transaction(async (db) => {
        const value = await ctx.db.presence.findFirst({
            where: {
                identityId: req.identityId,
                gameId: req.gameId,
                removedAt: null,
            },
        });

        if (!value) {
            throw new RuntimeError(
                "presence_not_found",
                { cause: `Presence not found for identity ${req.identityId} and game ${req.gameId}` },
            )
        }

        const isExpired = !!value.expires && new Date(value.expires).getTime() <= Date.now();
        if (!req.reviveIfExpired && isExpired) {
            throw new RuntimeError(
                "presence_expired",
                { cause: `Presence expired for identity ${req.identityId} and game ${req.gameId}` },
            )
        }

		const presence = await db.presence.update({
			where: {
				identityId_gameId: {
					identityId: req.identityId,
					gameId: req.gameId,
				},
			},
			data: {
                expires: req.expiresInMs ? new Date(Date.now() + req.expiresInMs).toISOString() : null,
			},
		});

		return { presence };
	});

	return {
		presence: prismaToOutput(presence),
	};
}
