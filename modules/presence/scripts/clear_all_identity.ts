import { ScriptContext } from "../_gen/scripts/clear_all_identity.ts";

export interface Request {
	identityId: string;
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
			identityId: req.identityId,
		},
		data: {
			removedAt: new Date().toISOString(),
			expires: null,
		},
	});

	return { cleared };
}
