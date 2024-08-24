import { Database, Query, RuntimeError, ScriptContext } from "../module.gen.ts";
import {
	completeMultipartUpload,
	getMultipartUploadParts,
	keyExists,
} from "../utils/bucket.ts";
import { getConfig } from "../utils/config_defaults.ts";
import {
	dbToOutput,
	getKey,
	UploadWithOptionalFiles,
	UploadWithoutFiles,
} from "../utils/types.ts";

export interface Request {
	uploadId: string;
}

export interface Response {
	upload: UploadWithoutFiles;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const config = getConfig(ctx);

	const newUpload = await ctx.db.transaction(async (tx) => {
		// Find the upload by ID
		const upload = await tx.query.uploads.findFirst({
			where: Query.eq(Database.uploads.id, req.uploadId),
			with: {
				files: true,
			},
		});
		if (!upload) {
			throw new RuntimeError(
				"upload_not_found",
				{
					meta: { uploadId: req.uploadId },
				},
			);
		}

		// Error if `complete` was already called with this ID
		if (upload.completedAt !== null) {
			throw new RuntimeError(
				"upload_already_completed",
				{
					meta: { uploadId: req.uploadId },
				},
			);
		}

		// Check with S3 to see if the files were uploaded
		const fileExistencePromises = upload.files.map(
			async (file) => {
				// If the file was uploaded in parts, complete the multipart upload
				if (file.multipartUploadId) {
					try {
						const parts = await getMultipartUploadParts(
							config.s3,
							getKey(upload.id, file.path),
							file.multipartUploadId,
						);
						if (parts.length === 0) return false;

						await completeMultipartUpload(
							config.s3,
							getKey(upload.id, file.path),
							file.multipartUploadId,
							parts,
						);
					} catch (e) {
						throw new RuntimeError(
							"multipart_upload_completion_fail",
							{ cause: e },
						);
					}

					return true;
				} else {
					// Check if the file exists
					return await keyExists(config.s3, getKey(upload.id, file.path));
				}
			},
		);
		const fileExistence = await Promise.all(fileExistencePromises);
		const filesAllExist = fileExistence.every(Boolean);
		if (!filesAllExist) {
			const missingFiles = upload.files.filter((_, i) => !fileExistence[i]);
			throw new RuntimeError(
				"files_not_uploaded",
				{
					meta: {
						uploadId: req.uploadId,
						missingFiles: missingFiles.map((file) => file.path),
					},
				},
			);
		}

		// Update the upload to mark it as completed
		const completedUploads = await tx.update(Database.uploads)
			.set({ completedAt: new Date() })
			.where(Query.eq(Database.uploads.id, req.uploadId))
			.returning();

		return completedUploads[0]!;
	});

	return {
		upload: dbToOutput(newUpload),
	};
}
