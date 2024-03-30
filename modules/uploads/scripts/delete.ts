import { RuntimeError, ScriptContext } from "../_gen/scripts/delete.ts";
import { getKey } from "../utils/types.ts";
import { deleteKeys } from "../utils/bucket.ts";

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
	const bytesDeleted = await ctx.db.$transaction(async (db) => {
		const upload = await db.upload.findFirst({
			where: {
				id: req.uploadId,
				completedAt: { not: null },
				deletedAt: null,
			},
			select: {
				id: true,
				userId: true,
				bucket: true,
				contentLength: true,
				files: true,
				createdAt: true,
				updatedAt: true,
				completedAt: true,
			},
		});
		if (!upload) {
			throw new RuntimeError(
				"upload_not_found",
				{
					cause: `Upload with ID ${req.uploadId} not found`,
					meta: { modified: false },
				},
			);
		}

		const filesToDelete = upload.files.map((file) =>
			getKey(file.uploadId, file.path)
		);
		const deleteResults = await deleteKeys(ctx.userConfig.s3, filesToDelete);

		const failures = upload.files
			.map((file, i) => [file, deleteResults[i]] as const)
			.filter(([, successfullyDeleted]) => !successfullyDeleted)
			.map(([file]) => file);

		if (failures.length) {
			const failedPaths = JSON.stringify(failures.map((file) => file.path));
			throw new RuntimeError(
				"failed_to_delete",
				{
					cause: `Failed to delete files with paths ${failedPaths}`,
					meta: { modified: failures.length !== filesToDelete.length },
				},
			);
		}

		await db.upload.update({
			where: {
				id: req.uploadId,
			},
			data: {
				deletedAt: new Date().toISOString(),
			},
		});

		return upload.contentLength.toString();
	});
	return { bytesDeleted };
}
