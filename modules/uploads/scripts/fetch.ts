import { Database, Query, ScriptContext } from "../module.gen.ts";
import { getConfig } from "../utils/config_defaults.ts";
import { dbToOutput, UploadWithOptionalFiles } from "../utils/types.ts";

export interface Request {
	uploadIds: string[];
	includeFiles?: boolean;
}

export interface Response {
	uploads: UploadWithOptionalFiles[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	getConfig(ctx);

	const uploads = await ctx.db.query.uploads.findMany({
		where: Query.inArray(Database.uploads.id, req.uploadIds),
		orderBy: Query.desc(Database.uploads.id),
		with: {
			files: req.includeFiles ? true : undefined,
		},
	});

	return {
		uploads: uploads.map((x) => dbToOutput(x)),
	};
}
