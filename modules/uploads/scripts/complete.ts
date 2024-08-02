import { RuntimeError, ScriptContext } from "../module.gen.ts";
import {
	completeMultipartUpload,
	getMultipartUploadParts,
	keyExists,
} from "../utils/bucket.ts";
import { getConfig } from "../utils/config_defaults.ts";
import { getKey, prismaToOutputWithFiles, Upload } from "../utils/types.ts";

export interface Request {
	uploadId: string;
}

export interface Response {
	upload: Upload;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const config = getConfig(ctx);

	const newUpload = await ctx.db.$transaction(async (db) => {
		// Find the upload by ID
		const upload = await db.upload.findFirst({
			where: {
				id: req.uploadId,
			},
			select: {
				id: true,
				metadata: true,
				bucket: true,
				contentLength: true,
				files: true,
				createdAt: true,
				updatedAt: true,
				completedAt: true,
			},
		});

		// Error if the upload wasn't prepared
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
		const completedUpload = await db.upload.update({
			where: {
				id: req.uploadId,
			},
			data: {
				completedAt: new Date(),
			},
			select: {
				id: true,
				metadata: true,
				bucket: true,
				contentLength: true,
				files: true,
				createdAt: true,
				updatedAt: true,
				completedAt: true,
			},
		});

		return completedUpload;
	});

	return {
		upload: prismaToOutputWithFiles(newUpload),
	};
}
