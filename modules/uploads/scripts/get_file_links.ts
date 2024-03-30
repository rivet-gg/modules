import { ScriptContext } from "../_gen/scripts/get_file_links.ts";
import { getKey, UploadFile } from "../utils/types.ts";
import { getPresignedGetUrl } from "../utils/bucket.ts";

export interface Request {
	files: { uploadId: string; path: string }[];
	validSecs?: number;
}

export interface Response {
	files: (UploadFile & { uploadId: string; url: string })[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
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
				ctx.userConfig.s3,
				key,
				req.validSecs ?? 60 * 60,
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
