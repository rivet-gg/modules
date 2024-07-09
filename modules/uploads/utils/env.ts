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

export function getS3EnvConfig(): S3Config | null {
	const endpoint = Deno.env.get("S3_ENDPOINT");
	const region = Deno.env.get("S3_REGION");
	const bucket = Deno.env.get("S3_BUCKET");
	const accessKeyId = Deno.env.get("S3_ACCESS_KEY_ID");
	const secretAccessKey = Deno.env.get("S3_SECRET_ACCESS_KEY");

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
