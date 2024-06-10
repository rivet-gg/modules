import { UploadSize } from "./utils/data_size.ts";

export interface Config {
	maxUploadSize?: UploadSize;
	maxMultipartUploadSize?: UploadSize;
	maxFilesPerUpload?: number;
	defaultMultipartChunkSize?: UploadSize;
}

export const DEFAULT_MAX_FILES_PER_UPLOAD = 10;

export const DEFAULT_MAX_UPLOAD_SIZE: UploadSize = "30mib";
export const DEFAULT_MAX_MULTIPART_UPLOAD_SIZE: UploadSize = "10gib";
export const DEFAULT_MULTIPART_CHUNK_SIZE: UploadSize = "10mib";
