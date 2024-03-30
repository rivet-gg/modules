import {
	Files as PrismaFiles,
	Upload as _PrismaUpload,
} from "../_gen/prisma/default.d.ts";
import { UploadSize } from "../config.ts";

interface PrismaUpload extends Omit<_PrismaUpload, "deletedAt"> {
	files: PrismaFiles[];
}

export interface Upload {
	id: string;
	userId: string | null;

	bucket: string;
	contentLength: string;

	files: UploadFile[];

	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
}

export interface UploadFile {
	path: string;
	mime: string | null;
	contentLength: string;
}

export interface PresignedUpload extends Omit<Upload, "files"> {
	files: PresignedUploadFile[];
}

export interface PresignedUploadFile extends UploadFile {
	presignedUrl: string;
}

export const getMaxBytes = (size: UploadSize): bigint => {
	const b = 1n;
	const kb = 1000n * b;
	const mb = 1000n * kb;
	const gb = 1000n * mb;
	const tb = 1000n * gb;

	const kib = 1024n * b;
	const mib = 1024n * kib;
	const gib = 1024n * mib;
	const tib = 1024n * gib;

	if ("b" in size) return BigInt(size.b) * b;
	else if ("kb" in size) return BigInt(size.kb) * kb;
	else if ("mb" in size) return BigInt(size.mb) * mb;
	else if ("gb" in size) return BigInt(size.gb) * gb;
	else if ("tb" in size) return BigInt(size.tb) * tb;
	else if ("kib" in size) return BigInt(size.kib) * kib;
	else if ("mib" in size) return BigInt(size.mib) * mib;
	else if ("gib" in size) return BigInt(size.gib) * gib;
	else if ("tib" in size) return BigInt(size.tib) * tib;
	else return size; // Unreachable
};

export const prismaToOutput = (upload: PrismaUpload): Upload => ({
	id: upload.id,
	userId: upload.userId,

	bucket: upload.bucket,
	contentLength: upload.contentLength.toString(),

	files: upload.files.map((file) => ({
		path: file.path,
		mime: file.mime,
		contentLength: file.contentLength.toString(),
	})),

	createdAt: upload.createdAt.toISOString(),
	updatedAt: upload.updatedAt.toISOString(),
	completedAt: upload.completedAt?.toISOString() ?? null,
});

export const getKey = (uploadId: string, path: string): string =>
	`${uploadId}/${path}`;
