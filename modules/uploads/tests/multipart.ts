import { test, TestContext } from "../module.gen.ts";
import {
	assert,
	assertEquals,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";
import { getS3EnvConfig } from "../utils/env.ts";

function randomBuffer(size: number): Uint8Array {
	const buffer = new Uint8Array(size);

	const bytesPerChunk = 1024;

	for (let i = 0; i < size; i += bytesPerChunk) {
		crypto.getRandomValues(buffer.slice(i, i + bytesPerChunk));
	}

	return buffer;
}

test("multipart uploads", async (ctx: TestContext) => {
  if (!getS3EnvConfig()) {
    ctx.log.warn("s3 not configured");
    return;
  }

	const path = faker.system.fileName();
	const contentLength = 20_000_000; // 20MB
	const mime = faker.system.mimeType();

	const fileData = randomBuffer(contentLength);

	// Tell the module the metadata about the upload.
	const { upload: presigned } = await ctx.modules.uploads.prepare({
		files: [
			{
				path,
				contentLength: contentLength.toString(),
				mime,
				multipart: true,
			},
		],
	});

	const { files: [{ presignedChunks }] } = presigned;

	for (const chunk of presignedChunks) {
		// Upload the data using the presigned URL(s) returned
		const uploadPutReq = await fetch(
			chunk.url,
			{
				method: "PUT",
				body: fileData.slice(
					parseInt(chunk.offset),
					parseInt(chunk.offset) + parseInt(chunk.contentLength),
				),
			},
		);
		assert(uploadPutReq.ok);
	}

	// Tell the module that the module had completed uploading.
	const { upload: completed } = await ctx.modules.uploads.complete({
		uploadId: presigned.id,
	});

	// Ensure the presigned and completed uploads are the same, except for
	// expected timestamp differences
	assertEquals({
		...presigned,
		files: presigned.files.map((file) => ({
			path: file.path,
			contentLength: file.contentLength,
			mime: file.mime,
		})),
		completedAt: null,
		updatedAt: null,
	}, {
		...completed,
		files: completed.files.map((file) => ({
			path: file.path,
			contentLength: file.contentLength,
			mime: file.mime,
		})),
		completedAt: null,
		updatedAt: null,
	});

	// Lookup the completed upload
	const { uploads: [retrieved] } = await ctx.modules.uploads.get({
		uploadIds: [completed.id],
		includeFiles: true,
	});
	assertEquals(completed, retrieved);

	// Get presigned URLs to download the files from
	const { files: [{ url: fileDownloadUrl }] } = await ctx.modules.uploads
		.getPublicFileUrls({
			files: [{ uploadId: completed.id, path: path }],
		});

	// Download the files, and make sure the data matches
	const fileDownloadReq = await fetch(fileDownloadUrl);
	const fileDownloadData = new Uint8Array(await fileDownloadReq.arrayBuffer());

	const fileDataHash = await crypto.subtle.digest("SHA-1", fileData);
	const fileDownloadDataHash = await crypto.subtle.digest(
		"SHA-1",
		fileDownloadData,
	);
	assertEquals(fileDataHash, fileDownloadDataHash);

	// Delete the file and assert that the amount of bytes deleted matches
	// what's expected
	const { bytesDeleted } = await ctx.modules.uploads.delete({
		uploadId: completed.id,
	});
	assertEquals(bytesDeleted, completed.contentLength);
	assertEquals(bytesDeleted, presigned.contentLength);
	assertEquals(bytesDeleted, retrieved?.contentLength);
	assertEquals(parseInt(bytesDeleted), fileData.byteLength);

	// Check that the upload can't still be retrieved
	const { uploads: uploadList } = await ctx.modules.uploads.get({
		uploadIds: [completed.id],
	});
	assertEquals(uploadList, []);

	const fileDownloadReqAfterDelete = await fetch(fileDownloadUrl);
	assert(!fileDownloadReqAfterDelete.ok);
});
