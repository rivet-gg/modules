import { TestContext, ScriptContext } from "../module.gen.ts";

export interface S3EnvConfig {
	S3_ENDPOINT: string;
	S3_REGION: string;
	S3_BUCKET: string;
	S3_ACCESS_KEY_ID: string;
	S3_SECRET_ACCESS_KEY: string;
}

export interface S3Config {
	region: string;
	endpoint: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
}

export function getS3EnvConfig(ctx: ScriptContext | TestContext): S3Config | null {
	const endpoint = ctx.environment.get("S3_ENDPOINT");
	const region = ctx.environment.get("S3_REGION");
	const bucket = ctx.environment.get("S3_BUCKET");
	const accessKeyId = ctx.environment.get("S3_ACCESS_KEY_ID");
	const secretAccessKey = ctx.environment.get("S3_SECRET_ACCESS_KEY");

	if (
		!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey
	) {
		return null;
	}

	return {
		endpoint,
		region,
		bucket,
		accessKeyId,
		secretAccessKey,
	};
}
