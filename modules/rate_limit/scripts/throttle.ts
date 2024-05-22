import { RuntimeError, ScriptContext } from "../module.gen.ts";

export interface Request {
	/**
	 * The type of entity to rate limit by. For example, "ip" or "user".
	 */
	type: string;

	/**
	 * The key to rate limit by. For example, the IP address or user ID.
	 */
	key: string;

	/**
	 * Number of requests in `period` before rate limiting.
	 */
	requests: number;

	/**
	 * How frequently to reset the request counter, in seconds.
	 */
	period: number;
}

export type Response = Record<string, never>;

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// interface TokenBucket {
	// 	tokens: number;
	// 	lastRefill: Date;
	// }
	//
	// // Update the token bucket
	// //
	// // `TokenBucket` is an unlogged table which are significantly faster to
	// // write to than regular tables, but are not durable. This is important
	// // because this script will be called on every request.
	// const rows = await ctx.db.$queryRaw<TokenBucket[]>`
	// 	WITH updated_bucket AS (
	// 		UPDATE "TokenBuckets" b
	// 		SET
	// 			"tokens" = CASE
	// 					-- Reset the bucket and consume 1 token
	// 					WHEN now() > b."lastRefill" + make_interval(secs => ${req.period}) THEN ${
	// 	req.requests - 1
	// }
	// 					-- Consume 1 token
	// 					ELSE b.tokens - 1
	// 				END,
	// 			"lastRefill" = CASE
	// 					WHEN now() > b."lastRefill" + make_interval(secs => ${req.period}) THEN now()
	// 					ELSE b."lastRefill"
	// 				END
	// 		WHERE b."type" = ${req.type} AND b."key" = ${req.key}
	// 		RETURNING b."tokens", b."lastRefill"
	// 	),
	// 	inserted AS (
	// 		INSERT INTO "TokenBuckets" ("type", "key", "tokens", "lastRefill")
	// 		SELECT ${req.type}, ${req.key}, ${req.requests - 1}, now()
	// 		WHERE NOT EXISTS (SELECT 1 FROM updated_bucket)
	// 		RETURNING "tokens", "lastRefill"
	// 	)
	// 	SELECT * FROM updated_bucket
	// 	UNION ALL
	// 	SELECT * FROM inserted;
	// `;
	// const { tokens, lastRefill } = rows[0];
	//
	// // If the bucket is empty, throw an error
	// if (tokens < 0) {
	// 	throw new RuntimeError("RATE_LIMIT_EXCEEDED", {
	// 		meta: {
	// 			retryAfter: new Date(lastRefill.getTime() + req.period * 1000)
	// 				.toUTCString(),
	// 		},
	// 	});
	// }

	return {};
}
