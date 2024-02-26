import { join } from "../deps.ts";
import { Project } from "../project/mod.ts";
import { getRuntimePath } from "./ogs_source.ts";

export async function generateDenoConfig(project: Project) {
    // Build config
    const config = {
        "imports": {
            "@ogs/runtime": await getRuntimePath(project),
        },
        "lint": {
            "include": ["src/"],
            "exclude": ["tests/"],
            "rules": {
                "exclude": ["no-empty-interface", "no-explicit-any", "require-await"]
            }
        },
        "fmt": {
            "useTabs": true
        }
    };

    // Write config
    const configPath = join(project.path, "deno.json");
    await Deno.writeTextFile(configPath, JSON.stringify(config, null, 4));
}
