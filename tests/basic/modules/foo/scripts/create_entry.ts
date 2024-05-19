import { ScriptContext } from "../module.gen.ts";

export interface Request extends Record<string, never> {}

export interface Response {
	id: string;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {
}

export async function run(
	ctx: ScriptContext,
	_req: Request,
): Promise<Response> {
	// Create user
	const entry = await ctx.db.dbEntry.create({ data: {} });

	return {
		id: entry.id,
	};
}
