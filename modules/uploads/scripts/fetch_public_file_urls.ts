import { ScriptContext, Database, Query } from "../module.gen.ts";
import { DownloadableFile, getKey } from "../utils/types.ts";
import { getPresignedGetUrl } from "../utils/bucket.ts";
import { getConfig } from "../utils/config_defaults.ts";

export interface Request {
	uploadId: string;
	filePaths: string[];
	// Defaults to 1 hour if not provided
	expirySeconds?: number;
}

export interface Response {
	files: DownloadableFile[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const config = getConfig(ctx);

	const upload = await ctx.db.query.uploads.findFirst({
		where: Query.and(
			Query.eq(Database.uploads.id, req.uploadId),
			Query.isNotNull(Database.uploads.completedAt),
			Query.isNull(Database.uploads.deletedAt),
		),
		with: {
			files: {
				where: Query.inArray(Database.files.path, req.filePaths),
			}
		}
	});

	// Check if dbFiles is defined before accessing its properties
	if (!upload || !upload.files) {
		throw new Error("Upload or files not found");
	}

	// Create presigned URLs that can be accessed using a simple GET request
	const formattedDownloadPromises = Array.from(upload.files)
		.map((file) => ({
			...file,
			url: getPresignedGetUrl(
				config.s3,
				getKey(upload.id, file.path),
				file.mime,
				req.expirySeconds ?? 60 * 60,
			),
		}))
		.map(async (file) => ({
			...file,
			contentLength: file.contentLength.toString(),
			url: await file.url,
		}));

	// Wait for all presigned URLs to be created
	const formattedUploads = await Promise.all(formattedDownloadPromises);

	return {
		files: formattedUploads,
	};
}