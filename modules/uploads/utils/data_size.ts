import { RuntimeError } from "../module.gen.ts";

export type UploadSize = string;

export function getBytes(size: UploadSize): bigint {
	const b = 1n;
	const kb = 1000n * b;
	const mb = 1000n * kb;
	const gb = 1000n * mb;
	const tb = 1000n * gb;

	const kib = 1024n * b;
	const mib = 1024n * kib;
	const gib = 1024n * mib;
	const tib = 1024n * gib;

	switch (size.slice(-3)) {
		case "kib":
			return BigInt(size.slice(0, -3)) * kib;
		case "mib":
			return BigInt(size.slice(0, -3)) * mib;
		case "gib":
			return BigInt(size.slice(0, -3)) * gib;
		case "tib":
			return BigInt(size.slice(0, -3)) * tib;
	}

	switch (size.slice(-2)) {
		case "kb":
			return BigInt(size.slice(0, -2)) * kb;
		case "mb":
			return BigInt(size.slice(0, -2)) * mb;
		case "gb":
			return BigInt(size.slice(0, -2)) * gb;
		case "tb":
			return BigInt(size.slice(0, -2)) * tb;
	}

	return BigInt(size.slice(0, -1)) * b;
}

export function getChunks(size: UploadSize, chunkSize: UploadSize): bigint {
	const fullChunks = getBytes(size) / getBytes(chunkSize);
	const hasRemainder = getBytes(size) % getBytes(chunkSize) > 0n;
	return fullChunks + (hasRemainder ? 1n : 0n);
}

const AWS_MAX_MULTIPART_CHUNKS = 10000n;
export function confirmAwsChunkCount(
	maxSize: UploadSize,
	chunkSize: UploadSize,
) {
	const chunks = getChunks(maxSize, chunkSize);
	if (chunks > AWS_MAX_MULTIPART_CHUNKS) {
		throw new RuntimeError("too_many_chunks", {
			meta: { maxConfiguredChunks: chunks },
		});
	}
}
