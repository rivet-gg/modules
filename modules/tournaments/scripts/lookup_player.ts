import { PlayerAssociations, PlayerPossibleIds } from "../utils/types.ts";
import { ScriptContext } from "../module.gen.ts";
import { lookupPlayer } from "../utils/blumint_api.ts";

export type Request = PlayerAssociations;
export type Response = PlayerPossibleIds;

export async function run(
	ctx: ScriptContext,
	req: Request
): Promise<Response> {
    return await lookupPlayer(ctx, req);
}