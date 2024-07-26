import { ScriptConfig } from "../config/module.ts";
import { AnySchemaElement } from "../build/schema/mod.ts";

export interface Script {
	path: string;
	name: string;
	config: ScriptConfig;

	schemas?: {
		request: AnySchemaElement;
		response: AnySchemaElement;
	};
}
