import { resolve, stringify } from "../deps.ts";
import { ProjectConfig } from "../config/project.ts";

export async function templateProject(rootPath: string) {
	await Deno.mkdir(rootPath, { recursive: true });

    // Create backend.yaml
    const defaultBackend: ProjectConfig = {
        registries: {
            local: {
                local: {
                    directory: "modules",
                }
            }
        },
        modules: {
            users: {},
        }
    };
    await Deno.writeTextFile(resolve(rootPath, "backend.yaml"), stringify(defaultBackend))

	// Create modules directory
	await Deno.mkdir(resolve(rootPath, "modules"), { recursive: true });
}
