import { ScriptContext } from "../_gen/scripts/extend.ts";
import { TokenWithSecret } from "../types/common.ts";
import { tokenFromRow } from "../types/common.ts";

export interface Request {
    token: string;
    newExpiration: string | null;
}

export interface Response {
	token: TokenWithSecret;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
    // Ensure the token hasn't expired or been revoked yet
    const { token } = await ctx.modules.tokens.validate({
        token: req.token,
    });

    // Update the token's expiration date
    const newToken = await ctx.db.token.update({
        where: {
            id: token.id,
        },
        data: {
            expireAt: req.newExpiration,
        },
    });

    // Return the updated token
	return {
		token: tokenFromRow(newToken),
	};
}
