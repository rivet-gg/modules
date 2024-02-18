import { ScriptContext } from "@ogs/helpers/users/get.ts";
import { User } from "../types/common.ts";
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

	const user = await ctx.db.transaction(async (tx) => {
		let rows = await tx.insert(ctx.schema.users).values({ username: req.username }).returning();
		let user = rows[0];

		let identityRows = await tx.insert(ctx.schema.identities).values({ userId: user.id }).returning({ id: ctx.schema.identities.id });
		let identity = identityRows[0];

		if (req.identity.guest) {
			await tx.insert(ctx.schema.identityGuests).values({ identityId: identity.id });
		} else {
			throw new Error("Invalid identity type");
		}

		return user;
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
