import { ScriptContext } from "../_gen/scripts/set.ts";
import { inputToPrisma, prismaToOutput } from "../utils/types.ts";
import { Presence } from "../utils/types.ts";

export type Request = Omit<Presence, "createdAt" | "updatedAt">;

export interface Response {
    presence: Presence
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const { presence } = await ctx.db.$transaction(async (db) => {
		const resetCreatedAt = await db.presence.count({
			where: {
				identityId: req.identityId,
				gameId: req.gameId,
				OR: [
					{ removedAt: { not: null } },
					{ expires: { lte: new Date().toISOString() } },
				],
			},
		});

		const presence = await db.presence.upsert({
			where: {
				identityId_gameId: {
					identityId: req.identityId,
					gameId: req.gameId,
				},
			},
			update: {
				...inputToPrisma(req),
				createdAt: resetCreatedAt ? new Date().toISOString() : undefined,
				removedAt: null,
			},
			create: inputToPrisma(req),
		});

		return { presence };
	});

	return {
		presence: prismaToOutput(presence),
	};
}
