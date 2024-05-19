import { tjs } from "./deps.ts";
import { ScriptConfig } from "../config/module.ts";

export interface Script {
	path: string;
	name: string;
	config: ScriptConfig;

	requestSchema?: tjs.Definition;
	responseSchema?: tjs.Definition;
}
