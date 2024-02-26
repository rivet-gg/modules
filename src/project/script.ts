import { join, tjs } from "../deps.ts";
import { Module } from "./module.ts";
import { ScriptConfig } from "../config/module.ts";
import { Project } from "./project.ts";

export interface Script {
	path: string;
	name: string;
	config: ScriptConfig;

	requestSchema?: tjs.Definition;
	responseSchema?: tjs.Definition;
}

/**
 * Get the path to the dist/helpers/{}/scripts/{}.ts
 */
export function scriptDistHelperPath(
	project: Project,
	module: Module,
	script: Script,
): string {
	return join(
		project.path,
		"dist",
		"helpers",
		module.name,
		"scripts",
		script.name + ".ts",
	);
}
