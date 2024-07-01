import { ProviderEndpoints } from "../config.ts";
import { RuntimeError, ScriptContext } from "../module.gen.ts";

/**
 * The token type that designates that this is a flow token
 */
const FLOW_TYPE = "auth_oauth_flow";

/**
 * Number of seconds after flow start that the flow will cease to be valid.
 *
 * This is currently hardcoded to 30 minutes, but it may be configurable in the
 * future.
 */
const FLOW_EXPIRE_TIME = 30 * 60;

/**
 * Calculates when the flow should expire using the current server time.
 *
 * Leap seconds are not accounted for because they really don't matter.
 *
 * @returns The `Date` object for when the flow should expire.
 */
function getExpiryTime() {
	const expiryTimeMs = Date.now() + FLOW_EXPIRE_TIME * 1000;
	return new Date(expiryTimeMs);
}

/**
 * @param ctx The ScriptContext with which to call tokens.create
 * @returns A flow token (TokenWithSecret) with the correct meta and expiry
 * time, the flow ID, and the expiry time.
 */
export async function createFlowToken(ctx: ScriptContext) {
    const flowId = crypto.randomUUID();
	const expiry = getExpiryTime();
	const { token } = await ctx.modules.tokens.create({
		type: FLOW_TYPE,
		meta: { flowId },
		expireAt: expiry.toISOString(),
	});
	return { token, flowId, expiry };
}

export type FlowStatus =
	| {
		status: "complete";
		userToken: string;
	}
	| { status: "pending" }
	| { status: "expired" }
	| { status: "cancelled" };

export async function getFlowStatus(
	ctx: ScriptContext,
	flowToken: string,
): Promise<FlowStatus> {
	const { tokens: [flowData] } = await ctx.modules.tokens.fetchByToken({
		tokens: [flowToken],
	});

	if (!flowData || flowData.type !== FLOW_TYPE) {
		throw new RuntimeError("flow_not_found");
	}

	// NOTE: Any tokens without an expiry date will always be expired
	const expireDate = flowData.expireAt
		? new Date(flowData.expireAt)
		: new Date(0);

	if (flowData.revokedAt) {
		return { status: "cancelled" };
	} else if (expireDate.getTime() <= Date.now()) {
		return { status: "expired" };
	} else if (flowData.meta.userToken) {
		return {
			status: "complete",
			userToken: flowData.meta.userToken.toString(),
		};
	}

	const provider = flowData.meta.provider;
	// const pollResult = await pollProvider(ctx, flowToken, provider);
	// if (pollResult) {
	// 	return {
	// 		status: "complete",
	// 		userToken: pollResult,
	// 	};
	// } else {
		return { status: "pending" };
	// }
}

export async function cancelFlow(
	ctx: ScriptContext,
	flowToken: string,
): Promise<void> {
	const status = await getFlowStatus(ctx, flowToken);
	const { tokens: [{ id: flowId }] } = await ctx.modules.tokens.fetchByToken({
		tokens: [flowToken],
	});

	switch (status.status) {
		case "complete":
			throw new RuntimeError("already_completed");
		case "expired":
			throw new RuntimeError("flow_expired");
		case "cancelled":
			throw new RuntimeError("flow_cancelled");

		case "pending":
			await ctx.modules.tokens.revoke({ tokenIds: [flowId] });
			return;
	}
}

export async function completeFlow(
	ctx: ScriptContext,
	flowToken: string,
	userId: string,
	additionalData: unknown,
): Promise<string> {
	const status = await getFlowStatus(ctx, flowToken);
	switch (status.status) {
		case "complete":
			throw new RuntimeError("already_completed");
		case "expired":
			throw new RuntimeError("flow_expired");
		case "cancelled":
			throw new RuntimeError("flow_cancelled");

		case "pending":
			break;
	}
	const { token } = await ctx.modules.users.createToken({ userId });
	await ctx.modules.tokens.modifyMeta({
		token: flowToken,
		newMeta: { userToken: token.token },
	});
	await ctx.modules.tokens.modifyMeta({
		token: token.token,
		newMeta: {
			data: additionalData,
		},
	});

	return token.token;
}
