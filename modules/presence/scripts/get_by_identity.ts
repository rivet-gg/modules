import { ScriptContext } from "../_gen/scripts/get_by_identity.ts";
import { prismaToOutput } from "../utils/types.ts";
import { Presence } from "../utils/types.ts";

export interface Request {
    identityId: string;
}

export interface Response {
    presences: Presence[]
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    const matchingIdentities = await ctx.db.presence.findMany({
        where: {
            identityId: req.identityId,
            removedAt: null,
            OR: [
                { expires: { gt: new Date().toISOString() } },
                { expires: null },
            ],
        },
    });

	return {
		presences: matchingIdentities.map(prismaToOutput),
	};
}
