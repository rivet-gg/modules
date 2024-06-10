import { ScriptContext } from "../module.gen.ts";
import { DownloadableFile, FileIdentifier, getKey } from "../utils/types.ts";
import { getPresignedGetUrl } from "../utils/bucket.ts";
import { getConfig } from "../utils/config_defaults.ts";

export interface Request {
	files: FileIdentifier[];
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
	const config = getConfig(ctx.userConfig);

	const dbFiles = await ctx.db.files.findMany({
		where: {
			uploadId: {
				in: req.files.map((file) => file.uploadId),
			},
			path: {
				in: req.files.map((file) => file.path),
			},
			upload: {
				completedAt: { not: null },
				deletedAt: null,
			},
		},
		select: {
			uploadId: true,
			path: true,
			contentLength: true,
			mime: true,
		},
	});

	const keys = new Set(
		req.files.map((file) => getKey(file.uploadId, file.path)),
	);
	const map = new Map(
		dbFiles.map((file) => [getKey(file.uploadId, file.path), file]),
	);
	for (const [mapKey] of map) {
		// Remove any keys that don't have a corresponding file
		if (!keys.has(mapKey)) map.delete(mapKey);
	}

	// Create presigned URLs that can be accessed using a simple GET request
	const formattedDownloadPromises = Array.from(map)
		.map(([key, file]) => ({
			...file,
			url: getPresignedGetUrl(
				config.s3,
				key,
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
