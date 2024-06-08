import { dirname, emptyDir, resolve } from "../deps.ts";

/**
 * Extract a JSON archive built by the src/artifacts/* scripts.
 */
export async function inflateArchive(archive: Record<string, any>, outputPath: string, signal?: AbortSignal) {
	signal?.throwIfAborted();

	await emptyDir(outputPath);

	for (const [file, value] of Object.entries(archive)) {
		signal?.throwIfAborted();

		const absPath = resolve(outputPath, file);
		await Deno.mkdir(dirname(absPath), { recursive: true });
		await Deno.writeTextFile(absPath, value);
	}
}
