import { ScriptContext, Module, Database, RuntimeError, Query } from "../module.gen.ts";
import { moveToOldIfNecessary } from "../utils/migrate.ts";

export interface Request {
	data: unknown;
	maxAttempts?: number;
	expireAt?: string;
}

export interface Response {
	id: string;
	code: string;
	token: string;
}

// This is very generous— we should definitely flush old verifications however
const MAX_ATTEMPTS = 20;

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	const failedCodes = [];
	try {
		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			// Generate code + token cryptographically using the `tokens` public
			// functions
			const code = Module.tokens.generateRandomCodeSecure("0123456789", 8);
			const token = Module.tokens.genSecureId(32, Module.tokens.SecureIdFormat.HEX);

			// Default to PG INT_MAX number of attempts
			const maxAttemptCount = req.maxAttempts ?? 0x7FFFFFFF;

			// If expiry is left unspecified, set for 1 day from now
			const expireAt = req.expireAt ? new Date(req.expireAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);

			const [verification] = await ctx.db.insert(Database.verifications).values({
				// The identifying data for the insertion. Not necessarily unique.
				data: req.data,

				code,
				token,
				maxAttemptCount,
				expireAt,
			}).returning({
				id: Database.verifications.id,
				code: Database.verifications.code,
				token: Database.verifications.token,
			}).onConflictDoNothing({
				target: Database.verifications.code,
			});

			if (!verification) {
				failedCodes.push(code);
				continue;
			}
			return verification;
		}

		throw new RuntimeError("unable_to_generate_unique_code");
	} catch (e) {
		if (e instanceof RuntimeError) {
			throw e;
		} else if (e instanceof Query.DrizzleError) {
			throw new RuntimeError("failed_to_create");
		} else {
			throw new RuntimeError("unknown_err");
		}
	} finally {
		await Promise.all(failedCodes.map(code => moveToOldIfNecessary(ctx, code)));
	}
}
