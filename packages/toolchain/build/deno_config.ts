import { resolve } from "../deps.ts";
import { Project } from "../project/mod.ts";

export async function generateDenoConfig(project: Project) {
	// Build config
	const config = {
		"lint": {
			"include": ["src/"],
			"exclude": ["tests/"],
			"rules": {
				"exclude": ["no-empty-interface", "no-explicit-any", "require-await"],
			},
		},
		"fmt": {
			"useTabs": true,
		},
	};

	// Write config
	const configPath = resolve(project.path, "deno.json");
	await Deno.writeTextFile(configPath, JSON.stringify(config, null, 4));
}
