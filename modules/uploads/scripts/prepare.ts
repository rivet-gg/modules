import { RuntimeError, ScriptContext } from "../_gen/scripts/prepare.ts";
import {
	getMaxBytes,
	PresignedUpload,
	prismaToOutput,
	UploadFile,
} from "../utils/types.ts";
import { getPresignedPutUrl } from "../utils/bucket.ts";

export interface Request {
	userId?: string;
	files: UploadFile[];
}

export interface Response {
	upload: PresignedUpload;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	// If there is a userId, ensure the user exists
	if (req.userId) {
		await ctx.modules.users.getUser({
			userIds: [req.userId],
		});
	}

	// Ensure there are files in the upload
	if (req.files.length === 0) {
		throw new RuntimeError("no_files");
	}

	// Ensure the number of files is within the limit
	if (req.files.length > ctx.userConfig.maxFilesPerUpload) {
		throw new RuntimeError(
			"too_many_files",
			{
				cause: `Max files per upload is ${ctx.userConfig.maxFilesPerUpload}` +
					` (requested upload of ${req.files.length} files)`,
			},
		);
	}

	// Ensure there are no duplicate paths
	const paths = new Set<string>();
	const duplicates = new Set<string>();
	for (const file of req.files) {
		if (paths.has(file.path)) {
			duplicates.add(file.path);
		}
		paths.add(file.path);
	}
	if (duplicates.size > 0) {
		const duplicateString = Array.from(duplicates).map((path) =>
			JSON.stringify(path)
		).join(", ");
		throw new RuntimeError("duplicate_paths", {
			cause: `Multiple files had paths ${duplicateString}`,
		});
	}

	// Ensure the total content length is within the limit
	const uploadContentLength = req.files.reduce(
		(acc, file) => acc + BigInt(file.contentLength),
		0n,
	);
	if (uploadContentLength > getMaxBytes(ctx.userConfig.maxUploadSize)) {
		throw new RuntimeError("size_limit_exceeded");
	}

	// Format the input files for prisma
	const inputFiles = req.files.map((file) => ({
		path: file.path,
		mime: file.mime,
		contentLength: BigInt(file.contentLength),
	}));

	// Create the upload in the database
	const upload = await ctx.db.upload.create({
		data: {
			userId: req.userId,
			bucket: ctx.userConfig.s3.bucket,
			contentLength: uploadContentLength,
			files: {
				create: inputFiles,
			},
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

	// Send requests to create presigned URLs for each file
	const formattedUploadPromises = upload.files.map((file) =>
		getPresignedPutUrl(
			ctx.userConfig.s3,
			upload.id,
			{
				path: file.path,
				contentLength: file.contentLength.toString(),
				mime: file.mime,
			},
		)
	);

	// Wait for all presigned URLs to be created
	const formattedUploads = await Promise.all(formattedUploadPromises);

	// Return the upload
	const presignedFiles = formattedUploads.map((formattedUpload, i) => ({
		...upload.files[i],
		contentLength: upload.files[i].contentLength.toString(),

		presignedUrl: formattedUpload.url,
	}));

	return {
		upload: {
			...prismaToOutput(upload),
			files: presignedFiles,
		},
	};
}
