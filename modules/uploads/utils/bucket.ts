import {
	CompleteMultipartUploadCommand, // Complete multipart upload
	CreateMultipartUploadCommand, // Initiate a multipart upload
	DeleteObjectCommand, // Delete object
	DeleteObjectsCommand, // Delete multiple objects
	GetObjectCommand, // Get URL uploaded file
	HeadObjectCommand, // Check if object exists
	ListPartsCommand, // List parts of multipart upload
	PutObjectCommand, // Get URL to upload single part file
	S3Client,
	UploadPartCommand, // Create URL for multipart upload chunk
} from "https://esm.sh/@aws-sdk/client-s3@^3.592.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@^3.592.0";

import { S3Config } from "./env.ts";
import { getKey, UploadFile } from "./types.ts";
import { PresignedChunk } from "./types.ts";

/**
 * Create a new S3 client instance based on the S3Config
 *
 * @param config S3 Config
 * @returns A new S3 client
 */
export function getClient(config: S3Config) {
	return new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		defaultUserAgentProvider: () =>
			Promise.resolve([
				["opengb/uploads", "0.1.0"],
			]),
	});
}

/**
 * Create a presigned URL to perform a SINGLE PART upload to S3
 *
 * @param config S3 Config
 * @param uploadId The ID of the Upload batch
 * @param file The file to upload
 * @param expirySeconds How long the upload URL should be valid for
 * @returns A URL that exposes an HTTP PUT endpoint to upload the file
 */
export async function getPresignedPutUrl(
	config: S3Config,
	uploadId: string,
	file: UploadFile,
	expirySeconds = 60 * 60,
): Promise<{ key: string; chunks: PresignedChunk[] }> {
	const client = getClient(config);

	const key = getKey(uploadId, file.path);
	const command = new PutObjectCommand({
		Bucket: config.bucket,
		Key: key,
		ContentType: file.mime ?? undefined,
		ContentLength: parseInt(file.contentLength),
	});
	const url = await getSignedUrl(
		client,
		command,
		{ expiresIn: expirySeconds },
	);

	return {
		chunks: [{
			url,
			partNumber: 0,
			offset: "0",
			contentLength: file.contentLength,
		}],
		key,
	};
}

export async function getPresignedMultipartUploadUrls(
	config: S3Config,
	uploadId: string,
	file: UploadFile,
	chunkSize: bigint,
	expirySeconds = 60 * 60 * 6,
): Promise<
	{ key: string; chunks: PresignedChunk[]; multipartUploadId: string }
> {
	const client = getClient(config);

	const key = getKey(uploadId, file.path);
	const command = new CreateMultipartUploadCommand({
		Bucket: config.bucket,
		Key: key,
		ContentType: file.mime ?? undefined,
	});
	const multipartUpload = await client.send(command);

	const id = multipartUpload.UploadId;
	if (!id) throw new Error("Multipart upload ID not returned");

	// Round up to the nearest chunk count
	const chunkCount = (BigInt(file.contentLength) + chunkSize - 1n) / chunkSize;

	const chunks: PresignedChunk[] = [];
	for (let i = 0n; i < chunkCount; i++) {
		const offset = i * chunkSize;
		const remaining = BigInt(file.contentLength) - offset;
		const length = remaining < chunkSize ? remaining : chunkSize;
		const partNumber = Number(i) + 1; // S3's part number is 1-based because reasons

		const command = new UploadPartCommand({
			Bucket: config.bucket,
			Key: key,
			UploadId: id,
			ContentLength: Number(length),
			PartNumber: partNumber,
		});

		const chunkPutUrl = await getSignedUrl(
			client,
			command,
			{ expiresIn: expirySeconds },
		);

		chunks.push({
			url: chunkPutUrl,
			partNumber,
			offset: offset.toString(),
			contentLength: length.toString(),
		});
	}

	return {
		chunks,
		multipartUploadId: id,
		key,
	};
}

export async function getMultipartUploadParts(
	config: S3Config,
	key: string,
	multipartUploadId: string,
): Promise<{ PartNumber: number; ETag: string }[]> {
	const client = getClient(config);

	const command = new ListPartsCommand({
		Bucket: config.bucket,
		Key: key,
		UploadId: multipartUploadId,
	});

	const response = await client.send(command);
	if (!response.Parts) return [];

	return response.Parts.map((part) => ({
		PartNumber: part.PartNumber ?? 0,
		ETag: part.ETag ?? "",
	}));
}

export async function completeMultipartUpload(
	config: S3Config,
	key: string,
	multipartUploadId: string,
	parts: { PartNumber: number; ETag: string }[],
): Promise<void> {
	const client = getClient(config);

	const command = new CompleteMultipartUploadCommand({
		Bucket: config.bucket,
		Key: key,
		UploadId: multipartUploadId,
		MultipartUpload: {
			Parts: parts,
		},
	});

	await client.send(command);
}

/**
 * Create a presigned URL to get a file from S3
 * @param config S3 Config
 * @param key A combination of the upload ID and the file path. (See `getKey`
 * function)
 * @param expirySeconds How long the URL should be valid for
 * @returns A URL that exposes an HTTP GET endpoint to download the file
 */
export async function getPresignedGetUrl(
	config: S3Config,
	key: string,
	mime: string | null,
	expirySeconds = 60 * 60,
) {
	const client = getClient(config);

	const command = new GetObjectCommand({
		Bucket: config.bucket,
		Key: key,
		ResponseContentType: mime ?? undefined,
	});
	const url = await getSignedUrl(
		client,
		command,
		{ expiresIn: expirySeconds },
	);

	return url;
}

/**
 * Check if a key exists in the S3 bucket. (Used on `complete` script to check
 * if the upload was actually completed.)
 *
 * @param config S3 Config
 * @param key A combination of the upload ID and the file path to check. (See
 * `getKey`)
 * @returns Whether the key exists in the S3 bucket
 */
export async function keyExists(
	config: S3Config,
	key: string,
): Promise<boolean> {
	const client = getClient(config);

	const command = new HeadObjectCommand({
		Bucket: config.bucket,
		Key: key,
	});

	try {
		await client.send(command);
		return true;
	} catch (error) {
		if (error instanceof Error && error.name === "NotFound") {
			return false;
		}
		throw error;
	}
}

export async function deleteKey(
	config: S3Config,
	key: string,
): Promise<boolean> {
	const client = getClient(config);

	const command = new DeleteObjectCommand({
		Bucket: config.bucket,
		Key: key,
	});

	const response = await client.send(command);
	return response.DeleteMarker ?? false;
}

export async function deleteKeys(
	config: S3Config,
	keys: string[],
): Promise<boolean[]> {
	const client = getClient(config);

	const command = new DeleteObjectsCommand({
		Bucket: config.bucket,
		Delete: {
			Objects: keys.map((key) => ({ Key: key })),
		},
	});

	const response = await client.send(command);
	if (response.Deleted) {
		const deletedKeys = response.Deleted.flatMap((obj) =>
			obj.Key ? [obj.Key] : []
		);
		const keySet = new Set(deletedKeys);
		return keys.map((key) => keySet.has(key));
	} else {
		return keys.map(() => false);
	}
}
