import { dirname, emptyDir, resolve } from "../deps.ts";
import { UnreachableError } from "../error/mod.ts";

/**
 * Extract a JSON archive built by the src/artifacts/* scripts.
 */
export async function inflateArchive(
	archive: Record<string, any>,
	outputPath: string,
	encode: "base64" | "string",
	signal?: AbortSignal,
) {
	signal?.throwIfAborted();

	await emptyDir(outputPath);

	for (const [file, value] of Object.entries(archive)) {
		signal?.throwIfAborted();

		const absPath = resolve(outputPath, file);
		await Deno.mkdir(dirname(absPath), { recursive: true });

		if (encode == "base64") {
			const decodedData = atob(value);
			const uint8Array = new Uint8Array(decodedData.length).map((_, i) => decodedData.charCodeAt(i));
			await Deno.writeFile(absPath, uint8Array);
		} else if (encode == "string") {
			await Deno.writeTextFile(absPath, value);
		} else {
			throw new UnreachableError(encode);
		}
	}
}
