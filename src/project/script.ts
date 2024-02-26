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

export function scriptGenPath(
	_project: Project,
	module: Module,
	script: Script,
): string {
	return join(
		module.path,
		"_gen",
		"scripts",
		script.name + ".ts",
	);
}
