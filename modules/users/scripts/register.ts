import { ScriptContext } from "../_gen/scripts/get.ts";
import { User } from "../types/common.ts";

// TODO:
// import { TokenWithSecret } from "../../tokens/types/common.ts";
// import { Response as TokenCreateResponse } from "../../tokens/scripts/create.ts";
type TokenWithSecret = any;
type TokenCreateResponse = any;

export interface Request {
	username: string;
	identity: IdentityType;
}

export interface Response {
	user: User;
	token: TokenWithSecret;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// await ctx.call("rate_limit", "throttle", { requests: 2, period: 5 * 60 });

	// Configure identity
	let identitiesCreate;
	if (req.identity.guest) {
		identitiesCreate = {
			identityGuest: {
				create: {},
			},
		};
	} else {
		throw new Error("Unknown identity type");
	}

	// Create user
	const user = await ctx.db.user.create({
		data: {
			username: req.username,
			identities: {
				create: identitiesCreate,
			},
		},
	});

	// Create token
	const { token } = await ctx.call("tokens", "create", {
		type: "user",
		meta: { userId: user.id },
		expireAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
	}) as TokenCreateResponse;

	return {
		user,
		token,
	};
}
