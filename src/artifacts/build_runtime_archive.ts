// deno task artifacts:build:runtime_archive
//
// Generates a JSON file with all of the runtime's source that can be used to re-populate the source

import { join } from "../deps.ts";
import { glob } from "./deps.ts";

const dirname = import.meta.dirname;
if (!dirname) throw new Error("Missing dirname");

const rootSrc = join(dirname, "..", "..");

const files = await glob.glob([
	"src/{runtime,types}/*.ts",
	"src/deps.ts",
], { cwd: rootSrc });

const archiveFiles: Record<string, string> = {};
for (const file of files) {
	archiveFiles[file] = await Deno.readTextFile(join(rootSrc, file));
}


// Create artifacts folder if it doesn't already exist
await Deno.mkdir(join(rootSrc, "artifacts"), { recursive: true });

// Write schema to file
await Deno.writeTextFile(
	join(rootSrc, "artifacts", "runtime_archive.json"),
	JSON.stringify(archiveFiles),
);
