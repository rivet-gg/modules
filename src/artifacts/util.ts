import { resolve } from "../deps.ts";
import { UnreachableError } from "../error/mod.ts";
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
export async function buildArtifacts(
	{ rootPath, patterns, outputPath, globOpts, encode }: {
		rootPath: string;
		patterns: string[];
		outputPath: string;
		globOpts?: any;
		encode?: "base64" | "string";
	},
) {
	encode = encode ?? "base64";

	// Glob files
	const files = await glob.glob(patterns, {
		cwd: rootPath,
		nodir: true,
		...globOpts,
	});

	// Build object
	const archiveFiles: Record<string, string> = {};
	for (const file of files) {
		if (encode == "base64") {
			const data = await Deno.readFile(resolve(rootPath, file));
			const base64String = btoa(new Uint8Array(data).reduce((acc, byte) => acc + String.fromCharCode(byte), ""));
			archiveFiles[file] = base64String;
		} else if (encode == "string") {
			archiveFiles[file] = await Deno.readTextFile(resolve(rootPath, file));
		} else {
			throw new UnreachableError(encode);
		}
	}

	// Write schema to file
	await Deno.writeTextFile(
		outputPath,
		JSON.stringify(archiveFiles),
	);

	// Print largest files. File sizes are in encoded format.
	console.log("Largest files:");
	Object.keys(archiveFiles)
		.sort((a, b) => archiveFiles[b].length - archiveFiles[a].length).slice(0, 10)
		.forEach((key) => console.log(key, Math.ceil(archiveFiles[key].length / 1000) + "KB"));
}
