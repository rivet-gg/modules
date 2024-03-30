export interface Config {
	maxUploadSize: UploadSize;
	maxFilesPerUpload: number;
	s3: S3Config;
}

type Units = "b" | "kb" | "mb" | "gb" | "tb" | "kib" | "mib" | "gib" | "tib";

export type UploadSize = {
	[unit in Units]: Record<unit, number>;
}[Units];

export interface S3Config {
	bucket: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	endpoint: string;
}
