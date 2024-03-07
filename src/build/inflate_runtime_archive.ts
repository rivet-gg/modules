import runtimeArchive from "../../artifacts/runtime_archive.json" with { type: "json" };
import { dirname, emptyDir, resolve } from "../deps.ts";
import { genRuntimePath, Project } from "../project/mod.ts";

/**
 * Writes a copy of the OpenGB runtime bundled with the CLI to the project.
 */
export async function inflateRuntimeArchive(project: Project) {
	const inflateRuntimePath = genRuntimePath(project);

	await emptyDir(inflateRuntimePath);

	for (const [file, value] of Object.entries(runtimeArchive)) {
		const absPath = resolve(inflateRuntimePath, file);
		await Deno.mkdir(dirname(absPath), { recursive: true });
		await Deno.writeTextFile(absPath, value);
	}
}
