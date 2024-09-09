import { ScriptContext, Query, Database, RuntimeError, UnreachableError } from "../module.gen.ts";
import { Verification } from "../utils/migrate.ts";

interface IdRequest {
	id: string;
}
interface TokenRequest {
	token: string;
}
interface DataRequest {
	data: {};
}

export type Request = IdRequest | TokenRequest | DataRequest;

export interface Response {
	verification?: Verification;
}

export async function run(ctx: ScriptContext, req: Request): Promise<Response> {
	let where: Query.SQL;
	if ("id" in req) {
		where = Query.eq(Database.verifications.id, req.id);
	} else if ("token" in req) {
		where = Query.eq(Database.verifications.token, req.token);
	} else if ("data" in req) {
		where = Query.eq(Database.verifications.data, req.data);
	} else {
		throw new UnreachableError(req);
	}
	try {
		const [verification] = await ctx.db.select()
			.from(Database.verifications)
			.where(where);
		return { verification };
	} catch (e) {
		throw new RuntimeError("unknown_err");
	}
}