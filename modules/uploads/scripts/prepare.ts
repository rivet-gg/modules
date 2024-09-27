import { Database, Query, RuntimeError, ScriptContext } from "../module.gen.ts";
import {
	dbToOutput,
	MultipartUploadFile,
	PresignedUpload,
} from "../utils/types.ts";
import {
	getPresignedMultipartUploadUrls,
	getPresignedPutUrl,
} from "../utils/bucket.ts";
import { getBytes } from "../utils/data_size.ts";
import { getConfig } from "../utils/config_defaults.ts";

export interface Request {
	metadata?: unknown;
	files: MultipartUploadFile[];
}

export interface Response {
	upload: PresignedUpload;
}

export async function run(
	ctx: ScriptContext,
	req: Request,
): Promise<Response> {
	const config = getConfig(ctx);

	// Ensure there are files in the upload
	if (req.files.length === 0) {
		throw new RuntimeError("no_files");
	}

	// Ensure the number of files is within the limit
	if (req.files.length > config.maxFilesPerUpload) {
		throw new RuntimeError(
			"too_many_files",
			{
				meta: {
					maxFilesPerUpload: config.maxFilesPerUpload,
					count: req.files.length,
				},
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
		throw new RuntimeError("duplicate_paths", {
			meta: { paths: Array.from(duplicates) },
		});
	}

	// Ensure the total content length is within the limit for single part uploads
	const singlepartUploadContentLength = req.files.filter((f) => !f.multipart)
		.reduce(
			(acc, file) => acc + BigInt(file.contentLength),
			0n,
		);
	if (singlepartUploadContentLength > getBytes(config.maxUploadSize)) {
		throw new RuntimeError(
			"size_limit_exceeded",
			{
				meta: {
					maxUploadSize: config.maxUploadSize,
					uploadContentLength: singlepartUploadContentLength,
				},
			},
		);
	}

	// Ensure the total content length is within the limit for multipart uploads
	const multipartUploadContentLength = req.files.filter((f) => f.multipart)
		.reduce(
			(acc, file) => acc + BigInt(file.contentLength),
			0n,
		);
	if (multipartUploadContentLength > getBytes(config.maxMultipartUploadSize)) {
		throw new RuntimeError(
			"size_limit_exceeded",
			{
				meta: {
					maxMultipartUploadSize: config.maxMultipartUploadSize,
					multipartUploadContentLength,
				},
			},
		);
	}

	const uploadContentLength = singlepartUploadContentLength +
		multipartUploadContentLength;

	const uploadId = crypto.randomUUID();
	const presignedInputFilePromises = req.files.map(async (file) => {
		if (file.multipart) {
			const { chunks, multipartUploadId } =
				await getPresignedMultipartUploadUrls(
					config.s3,
					uploadId,
					file,
					getBytes(config.defaultMultipartChunkSize),
				);

			return {
				...file,
				presignedChunks: chunks,
				multipartUploadId,
			};
		} else {
			const { chunks } = await getPresignedPutUrl(config.s3, uploadId, file);

			return {
				...file,
				presignedChunks: chunks,
				multipartUploadId: null,
			};
		}
	});
	const presignedInputFiles = await Promise.all(presignedInputFilePromises);

	// TODO: Convert this to a CTE to prevent extra RTT
	const upload = await ctx.db.transaction(async (tx) => {
		// Create the upload in the database
		const uploads = await tx.insert(Database.uploads)
			.values({
				id: uploadId,
				metadata: req.metadata,
				bucket: config.s3.bucket,
				contentLength: uploadContentLength,
			})
			.returning();
		const upload = uploads[0]!;

		// Insert the files
		const insertFiles = presignedInputFiles.map((file) => ({
			uploadId: uploadId,
			path: file.path,
			mime: file.mime,
			contentLength: BigInt(file.contentLength),
			multipartUploadId: file.multipartUploadId,
		}));
		await tx.insert(Database.files)
			.values(insertFiles)
			.execute();

		return upload;
	});

	return {
		upload: {
			...dbToOutput(upload),
			files: presignedInputFiles,
		},
	};
}
