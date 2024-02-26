import { Module } from "./module.ts";
import { ScriptConfig } from "../config/module.ts";
import { Registry } from "./registry.ts";
import * as path from "std/path/mod.ts";
import tjs from "typescript-json-schema";

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
	registry: Registry,
	module: Module,
	script: Script,
): string {
	return path.join(
		registry.path,
		"dist",
		"helpers",
		module.name,
		"scripts",
		script.name + ".ts",
	);
}
