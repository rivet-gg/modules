import { Database, Query, RuntimeError, ScriptContext } from "../module.gen.ts";
import { IdentityDataInput, IdentityProviderInfo } from "../utils/types.ts";

export interface Request {
	info: IdentityProviderInfo;
	uniqueData: IdentityDataInput;
}

export interface Response {
	userToken: string;
	userId: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Get user the provider is associated with
	const identity = await ctx.db.query.userIdentities.findFirst({
		where: Query.and(
			Query.eq(Database.userIdentities.identityType, req.info.identityType),
			Query.eq(Database.userIdentities.identityId, req.info.identityId),
			Query.eq(Database.userIdentities.uniqueData, req.uniqueData),
		),
		columns: {
			userId: true,
		},
	});

	// If the provider info/uniqueData combo is not associated with a user,
	// throw provider_not_found error.
	if (!identity) {
		throw new RuntimeError("identity_provider_not_found", { statusCode: 404 });
	}

	// Generate a user token
	const { token: { token } } = await ctx.modules.users.createToken({
		userId: identity.userId,
	});
	return {
		userToken: token,
		userId: identity.userId,
	};
}
