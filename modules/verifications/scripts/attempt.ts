import { ScriptContext, Query, Database, RuntimeError } from "../module.gen.ts";
import { complete, moveToOldIfNecessary } from "../utils/migrate.ts";

export interface Request {
	token: string;
	code: string;
}

export interface Response {
	succeeded: boolean;
	canTryAgain: boolean;
	data: unknown;
}

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	try {
		const [verification] = await ctx.db.select()
			.from(Database.verifications)
			.where(Query.eq(Database.verifications.token, req.token));
	
		if (!verification) throw new RuntimeError("no_verification_found");
		if (await moveToOldIfNecessary(ctx, verification.code)) throw new RuntimeError("no_verification_found");
	
		let codeDiffers = Number(req.code.length !== verification.code.length);
		for (let i = 0; i < verification.code.length; i++) {
			codeDiffers |= verification.code.charCodeAt(i) ^ req.code.charCodeAt(i);
		}

		if (codeDiffers) {
			await ctx.db.update(Database.verifications)
				.set({
					attemptCount: Query.sql`${Database.verifications.attemptCount} + 1`,
				})
				.where(Query.eq(Database.verifications.id, verification.id)).returning();
			const canTryAgain = !await moveToOldIfNecessary(ctx, verification.code);
			return {
				succeeded: false,
				canTryAgain,
				data: verification.data,
			}
		} else {
			await complete(ctx, verification.id);
			return {
				succeeded: true,
				canTryAgain: false,
				data: verification.data,
			}
		}
	} catch (e) {
		if (e instanceof RuntimeError) {
			throw e;
		} else if (e instanceof Query.DrizzleError) {
			throw new RuntimeError("failed_to_update");
		} else {
			throw new RuntimeError("unknown_err");
		}
	}
}