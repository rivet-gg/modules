import { resolve } from "../deps.ts";
import { glob } from "./deps.ts";

/**
 * Path to the root of the repo. Used for reading & writing files to the
 * project.
 */
export function rootSrcPath() {
	const dirname = import.meta.dirname;
	if (!dirname) throw new Error("Missing dirname");

	return resolve(dirname, "..", "..");
}

/**
 * @param files Files to include in the archive. Usually generated using glob.
 * @param outputPath JSON file to write the archive to.
 */
export async function buildArtifacts(rootPath: string, patterns: string[], outputPath: string, opts = {}) {
	// Glob files
	const files = await glob.glob(patterns, {
		cwd: rootPath,
		nodir: true,
		...opts,
	});

	// Build object
	const archiveFiles: Record<string, string> = {};
	for (const file of files) {
		archiveFiles[file] = await Deno.readTextFile(resolve(rootPath, file));
	}

	// Write schema to file
	await Deno.writeTextFile(
		outputPath,
		JSON.stringify(archiveFiles),
	);

	// Print largest files
	console.log("Largest files:");
	Object.keys(archiveFiles)
		.sort((a, b) => archiveFiles[b].length - archiveFiles[a].length).slice(0, 10)
		.forEach((key) => console.log(key, Math.ceil(archiveFiles[key].length / 1000) + "KB"));
}
