import { tjs } from "./deps.ts";
import { ScriptConfig } from "../config/module.ts";
import { AnySchemaElement } from "../build/schema/mod.ts";

export interface Script {
	path: string;
	name: string;
	config: ScriptConfig;

	/**
	 * @deprecated please use `schemas.request`
	 * @see Script.schemas
	 */
	requestSchema?: tjs.Definition;
	/**
	 * @deprecated please use `schemas.response`
	 * @see Script.schemas
	 */
	responseSchema?: tjs.Definition;

	schemas?: {
		request: AnySchemaElement;
		response: AnySchemaElement;
	};
}
