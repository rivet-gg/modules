import { ScriptContext } from "@ogs/helpers/users/scripts/get.ts";
import { User } from "../schema/common.ts";
// import { TokenWithSecret } from "../../tokens/schema/common.ts";
// import { Response as TokenCreateResponse } from "../../tokens/scripts/create.ts";

export interface Request {
	username: string;
	identity: IdentityType;
}

export interface Response {
	user: User;
	// token: TokenWithSecret;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {
}

export async function handler(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// await ctx.call("rate_limit", "throttle", { requests: 2, period: 5 * 60 });

	// Configure identity
	let identitiesCreate;
	if (req.identity.guest) {
		identitiesCreate = {
			identityGuest: {
				create: {}
			}
		};
	} else {
		throw new Error("Unknown identity type");
	}

	// Create user
	const user = await ctx.db.user.create({
		data: {
			username: req.username,
			identities: {
				create: identitiesCreate
			}
		}
	});

	// // Create token
	// const { token } = await ctx.call("tokens", "create", {
	// 	type: "user",
	// 	meta: { userId: user.id },
	// 	expire_at: Temporal.Now.plainDateISO().add({ days: 30 }).toString(),
	// }) as TokenCreateResponse;

	return {
		user,
		// token
	};
}
