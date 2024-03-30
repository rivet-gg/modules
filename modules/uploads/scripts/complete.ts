import { RuntimeError, ScriptContext } from "../_gen/scripts/complete.ts";
import { prismaToOutput } from "../utils/types.ts";
import { Upload } from "../utils/types.ts";

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
	const newUpload = await ctx.db.$transaction(async (db) => {
		// Find the upload by ID
		const upload = await db.upload.findFirst({
			where: {
				id: req.uploadId,
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

		// Error if the upload wasn't prepared
		if (!upload) {
			throw new RuntimeError(
				"upload_not_found",
				{ cause: `Upload with ID ${req.uploadId} not found` },
			);
		}

		// Error if `complete` was already called with this ID
		if (upload.completedAt !== null) {
			throw new RuntimeError(
				"upload_already_completed",
				{ cause: `Upload with ID ${req.uploadId} has already been completed` },
			);
		}

		// Update the upload to mark it as completed
		const completedUpload = await db.upload.update({
			where: {
				id: req.uploadId,
			},
			data: {
				completedAt: new Date().toISOString(),
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

		return completedUpload;
	});

	return {
		upload: prismaToOutput(newUpload),
	};
}
