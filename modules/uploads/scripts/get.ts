import { ScriptContext } from "../module.gen.ts";
import { getConfig } from "../utils/config_defaults.ts";
import {
	prismaToOutput,
	PrismaUploadWithOptionalFiles,
	UploadWithOptionalFiles,
} from "../utils/types.ts";

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
	getConfig(ctx.userConfig);

	// Find uploads that match the IDs in the request
	const dbUploads = await ctx.db.upload.findMany({
		where: {
			id: {
				in: req.uploadIds,
			},
			completedAt: { not: null },
			deletedAt: null,
		},
		select: {
			id: true,
			metadata: true,
			bucket: true,
			contentLength: true,
			files: !!req.includeFiles,
			createdAt: true,
			updatedAt: true,
			completedAt: true,
		},
		orderBy: {
			id: "asc",
		},
	}) as PrismaUploadWithOptionalFiles[];

	return {
		uploads: dbUploads.map((up) => prismaToOutput(up)),
	};
}
