import { ScriptContext } from "../_gen/scripts/list_for_user.ts";

export interface Request {
	userIds: string[];
}

export interface Response {
	uploadIds: Record<string, string[]>;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Find uploads that match the IDs in the request
	const dbUploads = await ctx.db.upload.findMany({
		where: {
			userId: {
				in: req.userIds,
			},
			completedAt: { not: null },
			deletedAt: null,
		},
		select: {
			id: true,
			userId: true,
		},
	});

	// Map each userId to an array of upload IDs with that associated user ID
	// TODO: There may be a more efficient way to do this? Not sure.
	const uploadIds = Object.fromEntries(req.userIds.map((userId) => {
		const uploads = dbUploads.filter((upload) => upload.userId === userId);
		return [userId, uploads.map((upload) => upload.id)] as const;
	}));

	return { uploadIds };
}
