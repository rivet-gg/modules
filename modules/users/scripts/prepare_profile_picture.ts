import { ScriptContext, RuntimeError, Module } from "../module.gen.ts";
import { DEFAULT_MIME_TYPES } from "../config.ts";

export interface Request {
    mime: string;
	contentLength: string;
	userToken: string;
}

export interface Response {
	url: string;
	uploadId: string;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// Authenticate/rate limit because this is a public route
	await ctx.modules.rateLimit.throttlePublic({ period: 60, requests: 5 });
	const { userId } = await ctx.modules.users.authenticateUser({ userToken: req.userToken });

	// Ensure at least the MIME type says it is an image
	const allowedMimes = ctx.userConfig.allowedMimes ?? DEFAULT_MIME_TYPES;
	if (!allowedMimes.includes(req.mime)) {
		throw new RuntimeError(
			"invalid_mime_type",
			{ cause: `MIME type ${req.mime} is not an allowed image type` },
		);
	}

	// Ensure the file is within the maximum configured size for a PFP
	const maxBytes = Module.uploads.getBytes(ctx.userConfig.maxProfilePictureSize);
	if (BigInt(req.contentLength) > maxBytes) { 
		throw new RuntimeError(
			"file_too_large",
			{ cause: `File is too large (${req.contentLength} bytes)` },
		);
	}

	// Prepare the upload to get the presigned URL
	const { upload: presigned } = await ctx.modules.uploads.prepare({
		files: [
			{
				path: `profile-picture`,
				contentLength: req.contentLength,
				mime: req.mime,
				multipart: false,
			},
		],
	});

	return {
		url: presigned.files[0].presignedChunks[0].url,
		uploadId: presigned.id,
	}
}
