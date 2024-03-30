import { ScriptContext } from "../_gen/scripts/get.ts";
import { prismaToOutput } from "../utils/types.ts";
import { Upload } from "../utils/types.ts";

export interface Request {
	uploadIds: string[];
}

export interface Response {
	uploads: (Upload | null)[];
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
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
			userId: true,
			bucket: true,
			contentLength: true,
			files: true,
			createdAt: true,
			updatedAt: true,
			completedAt: true,
		},
	});

	// Create a map of uploads by ID
	const uploadMap = new Map(dbUploads.map((upload) => [upload.id, upload]));

	// Reorder uploads to match the order of the request
	const uploads = req.uploadIds.map((uploadId) => {
		const upload = uploadMap.get(uploadId);
		// If the upload wasn't found, return null
		return upload ? prismaToOutput(upload) : null;
	});

	return { uploads };
}
