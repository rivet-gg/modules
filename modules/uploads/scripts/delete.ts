import { RuntimeError, ScriptContext, Database, Query } from "../module.gen.ts";
import { getKey } from "../utils/types.ts";
import { deleteKeys } from "../utils/bucket.ts";
import { getConfig } from "../utils/config_defaults.ts";

export interface Request {
	uploadId: string;
}

export interface Response {
	bytesDeleted: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const config = getConfig(ctx);

	const bytesDeleted = await ctx.db.transaction(async tx => {
		// Find upload
		const upload = await tx.query.uploads.findFirst({
			where: Query.and(
				Query.eq(Database.uploads.id, req.uploadId),
				Query.isNotNull(Database.uploads.completedAt),
				Query.isNull(Database.uploads.deletedAt)
			),
			with: {
				files: true
			}
		});
		if (!upload) {
			throw new RuntimeError(
				"upload_not_found",
				{
					meta: {
						modified: false,
						uploadId: req.uploadId,
					},
				},
			);
		}

		// Delete files from S3
		const filesToDelete = upload.files.map((file) =>
			getKey(file.uploadId, file.path)
		);
		const deleteResults = await deleteKeys(config.s3, filesToDelete);

		const failures = upload.files
			.map((file, i) => [file, deleteResults[i]] as const)
			.filter(([, successfullyDeleted]) => !successfullyDeleted)
			.map(([file]) => file);

		if (failures.length) {
			const failedPaths = JSON.stringify(failures.map((file) => file.path));
			throw new RuntimeError(
				"failed_to_delete",
				{
					meta: {
						modified: failures.length !== filesToDelete.length,
						reason: `Failed to delete files with paths ${failedPaths}`,
					},
				},
			);
		}

		// Update upload
		tx.update(Database.uploads)
			.set({ deletedAt: new Date() })
			.where(Query.eq(Database.uploads.id, req.uploadId))

		return upload.contentLength.toString();
	});
	return { bytesDeleted };
}
