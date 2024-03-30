import { test, TestContext } from "../_gen/test.ts";
import {
	assert,
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { faker } from "https://deno.land/x/deno_faker@v1.0.3/mod.ts";

test("e2e", async (ctx: TestContext) => {
	const path = faker.system.fileName();
	const contentLength = faker.random.number(100);
	const mime = faker.system.mimeType();

	const fileData = crypto.getRandomValues(new Uint8Array(contentLength));

	// Tell the module the metadata about the upload.
	const { upload: presigned } = await ctx.modules.uploads.prepare({
		files: [
			{ path, contentLength, mime },
		],
	});

	// Upload the data using the presigned URLs returned
	const uploadPutReq = await fetch(
		presigned.files[0].presignedUrl,
		{
			method: "PUT",
			body: fileData,
		},
	);
	assert(uploadPutReq.ok);

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
	});
	assertEquals(completed, retrieved);

	// Get presigned URLs to download the files from
	const { files: [{ url: fileDownloadUrl }] } = await ctx.modules.uploads
		.getFileLinks({
			files: [{ uploadId: completed.id, path: path }],
		});

	// Download the files, and make sure the data matches
	const fileDownloadReq = await fetch(fileDownloadUrl);
	const fileDownloadData = new Uint8Array(await fileDownloadReq.arrayBuffer());
	assertEquals(fileData, fileDownloadData);

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
	const { uploads: [retrievedAfterDeleted] } = await ctx.modules.uploads.get({
		uploadIds: [completed.id],
	});
	assertEquals(retrievedAfterDeleted, null);

	const fileDownloadReqAfterDelete = await fetch(fileDownloadUrl);
	assert(!fileDownloadReqAfterDelete.ok);
});
