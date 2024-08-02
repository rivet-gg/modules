import { prisma } from "../module.gen.ts";

type PrismaFiles = prisma.Files;
type _PrismaUpload = prisma.Upload;

interface PrismaUpload extends Omit<_PrismaUpload, "deletedAt"> {
	files: PrismaFiles[];
}

export interface Upload {
	id: string;
	metadata?: prisma.Prisma.JsonValue;

	bucket: string;

	/**
	 * The total size of all files in the upload in bytes.
	 *
	 * *(This is a string instead of a bigint because JSON doesn't support
	 * serializing/deserializing bigints, and we want to be able to represent
	 * very large file sizes.)*
	 */
	contentLength: string;

	files: UploadFile[];

	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
}

export interface UploadFile {
	path: string;
	mime: string | null;

	/**
	 * The size of the file in bytes.
	 *
	 * *(This is a string instead of a bigint because JSON doesn't support
	 * serializing/deserializing bigints, and we want to be able to represent
	 * very large file sizes.)*
	 */
	contentLength: string;
}

export interface FileIdentifier {
	uploadId: string;
	path: string;
}

export interface DownloadableFile extends UploadFile {
	uploadId: string;
	url: string;
}

export interface MultipartUploadFile extends UploadFile {
	multipart: boolean;
}

export interface PresignedUpload extends Omit<Upload, "files"> {
	files: PresignedUploadFile[];
}

export interface PresignedUploadFile extends UploadFile {
	presignedChunks: PresignedChunk[];
}

export interface PresignedChunk {
	url: string;

	partNumber: number;

	/**
	 * The size of this SPECIFIC chunk in bytes.
	 * This is ***not*** the total size of the file.
	 * This is also ***not*** guaranteed to be the same as the `contentLength`
	 * of all other chunks.
	 *
	 * *(This is a string instead of a bigint because JSON doesn't support
	 * serializing/deserializing bigints, and we want to be able to represent
	 * very large file sizes.)*
	 */
	contentLength: string;

	/**
	 * The offset of this chunk in the file.
	 *
	 * Essentially, this chunk expects to represent the data from byte `offset`
	 * to byte `offset + contentLength - 1` inclusive.
	 *
	 * *(This is a string instead of a bigint because JSON doesn't support
	 * serializing/deserializing bigints, and we want to be able to represent
	 * very large file sizes.)*
	 */
	offset: string;
}

type UploadWithoutFiles = Omit<Upload, "files">;
type PrismaUploadWithoutFiles = Omit<PrismaUpload, "files">;

export type UploadWithOptionalFiles = UploadWithoutFiles & {
	files?: UploadFile[];
};
export type PrismaUploadWithOptionalFiles = PrismaUploadWithoutFiles & {
	files?: PrismaFiles[];
};

export function prismaToOutput(
	upload: PrismaUploadWithOptionalFiles,
): UploadWithOptionalFiles {
	return {
		id: upload.id,
		metadata: upload.metadata,

		bucket: upload.bucket,
		contentLength: upload.contentLength.toString(),

		files: upload.files?.map((file) => ({
			path: file.path,
			mime: file.mime,
			contentLength: file.contentLength.toString(),
		})),

		createdAt: upload.createdAt.toISOString(),
		updatedAt: upload.updatedAt.toISOString(),
		completedAt: upload.completedAt?.toISOString() ?? null,
	};
}

export function prismaToOutputWithFiles(upload: PrismaUpload): Upload {
	return {
		...prismaToOutput(upload),
		files: upload.files?.map((file) => ({
			path: file.path,
			mime: file.mime,
			contentLength: file.contentLength.toString(),
		})),
	};
}

export function getKey(uploadId: string, path: string): string {
	return `${uploadId}/${path}`;
}
