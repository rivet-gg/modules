import { ScriptContext, RuntimeError } from "../module.gen.ts";
import { User } from "../utils/types.ts";
import { withPfpUrls } from "../utils/pfp.ts";

export interface Request {
	uploadId: string;
	userToken: string;
}

export interface Response {
	user: User;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Authenticate/rate limit because this is a public route
	await ctx.modules.rateLimit.throttlePublic({ period: 60, requests: 5 });
	const { userId } = await ctx.modules.users.authenticateUser({ userToken: req.userToken });

	// Complete the upload in the `uploads` module
	await ctx.modules.uploads.complete({ uploadId: req.uploadId });

	// Delete the old uploaded profile picture and replace it with the new one
	const [user] = await ctx.db.$transaction(async (db) => {
		// If there is an existing profile picture, delete it
		const oldUser = await db.user.findFirst({
			where: { id: userId },
		});

		// (This means that `users.authenticateUser` is broken!)
		if (!oldUser) {
			throw new RuntimeError(
				"internal_error",
				{
					meta: "Existing user not found",
				},
			);
		}

		if (oldUser.avatarUploadId) {
			await ctx.modules.uploads.delete({ uploadId: oldUser.avatarUploadId });
		}

		// Update the user upload ID
		const user = await db.user.update({
			where: {
				id: userId,
			},
			data: {
				avatarUploadId: req.uploadId,
			},
			select: {
				id: true,
				username: true,
				avatarUploadId: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new RuntimeError("internal_error", { cause: "User not found" });
		}

		return await withPfpUrls(
			ctx,
			[user],
		);
	});

	return { user };
}
