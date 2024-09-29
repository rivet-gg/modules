import { RuntimeError, ScriptContext } from "../module.gen.ts";
import { getS3EnvConfig, S3Config } from "./env.ts";

import * as defaults from "../config.ts";
import { confirmAwsChunkCount, UploadSize } from "./data_size.ts";

interface Config {
	maxUploadSize: UploadSize;
	maxMultipartUploadSize: UploadSize;
	maxFilesPerUpload: number;
	defaultMultipartChunkSize: UploadSize;
	s3: S3Config;
}

export function getConfig(ctx: ScriptContext): Required<Config> {
	const s3 = getS3EnvConfig(ctx);
	if (!s3) throw new RuntimeError("s3_not_configured");

	const nonOptionalConfig = {
		maxUploadSize: ctx.config.maxUploadSize ?? defaults.DEFAULT_MAX_UPLOAD_SIZE,
		maxMultipartUploadSize: ctx.config.maxMultipartUploadSize ??
			defaults.DEFAULT_MAX_MULTIPART_UPLOAD_SIZE,
		maxFilesPerUpload: ctx.config.maxFilesPerUpload ??
			defaults.DEFAULT_MAX_FILES_PER_UPLOAD,
		defaultMultipartChunkSize: ctx.config.defaultMultipartChunkSize ??
			defaults.DEFAULT_MULTIPART_CHUNK_SIZE,
		s3,
	};

	confirmAwsChunkCount(
		nonOptionalConfig.maxMultipartUploadSize,
		nonOptionalConfig.defaultMultipartChunkSize,
	);

	return nonOptionalConfig;
}
