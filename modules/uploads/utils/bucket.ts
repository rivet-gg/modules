import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

import { S3Config } from "../config.ts";
import { getKey, UploadFile } from "./types.ts";

export const getClient = (config: S3Config) =>
	new S3Client({
		region: config.region,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		endpoint: config.endpoint,
		defaultUserAgentProvider: () =>
			Promise.resolve([
				["opengb/uploads", "0.1.0"],
			]),
	});

export const getPresignedPutUrl = async (
	config: S3Config,
	uploadId: string,
	file: UploadFile,
	expirySeconds = 60 * 60,
) => {
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
		url,
		key,
	};
};

export const getPresignedGetUrl = async (
	config: S3Config,
	key: string,
	expirySeconds = 60 * 60,
) => {
	const client = getClient(config);

	const command = new GetObjectCommand({
		Bucket: config.bucket,
		Key: key,
	});
	const url = await getSignedUrl(
		client,
		command,
		{ expiresIn: expirySeconds },
	);

	return url;
};

export const deleteKey = async (
	config: S3Config,
	key: string,
): Promise<boolean> => {
	const client = getClient(config);

	const command = new DeleteObjectCommand({
		Bucket: config.bucket,
		Key: key,
	});

	const response = await client.send(command);
	return response.DeleteMarker ?? false;
};

export const deleteKeys = async (
	config: S3Config,
	keys: string[],
): Promise<boolean[]> => {
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
};
