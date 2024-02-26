import { join, dirname, fromFileUrl } from "../deps.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

export async function generate() {
	interface Generator {
		generator: string;
	}

	const GENERATORS: Record<string, Generator> = {
		typescript: {
			generator: "typescript-fetch",
		},
	};

	async function main() {
		const rootPath = join(__dirname, "..", "..", "..");
		for (const name in GENERATORS) {
			const generator = GENERATORS[name];
			await generateSdk(rootPath, name, generator);
		}
	}

	async function generateSdk(
		rootPath: string,
		name: string,
		config: Generator,
	) {
		console.log("Generating", name);
		const { success } = await new Deno.Command("docker", {
			args: [
				"docker",
				"run",
				"--rm",
				"-v",
				`${rootPath}:/local`,
				"openapitools/openapi-generator-cli:v7.2.0",
				"generate",
				"-i",
				"/local/dist/openapi.json",
				"-g",
				config.generator,
				"-o",
				`/local/dist/sdks/${name}/`,
			],
		}).output();
		if (!success) {
			throw new Error("Failed to generate OpenAPI SDK");
		}
	}

	main();
}
