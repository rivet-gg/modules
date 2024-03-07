import runtimeArchive from "../../artifacts/runtime_archive.json" with { type: "json" };
import { resolve, emptyDir, dirname } from "../deps.ts";
import { Project, genRuntimePath } from "../project/mod.ts";

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