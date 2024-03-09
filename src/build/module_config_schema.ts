import { Ajv } from "./deps.ts";
import { configPath, Module, Project } from "../project/mod.ts";
import { runJob } from "../utils/worker_pool.ts";
import { WorkerRequest, WorkerResponse } from "./module_config_schema.worker.ts";
import { createWorkerPool } from "../utils/worker_pool.ts";
import { exists } from "../deps.ts";

const WORKER_POOL = createWorkerPool<WorkerRequest, WorkerResponse>({
	source: import.meta.resolve("./module_config_schema.worker.ts"),
});

export async function compileModuleConfigSchema(
	_project: Project,
	module: Module,
): Promise<void> {
	// Read schema
	if (await exists(configPath(module))) {
		// Load config
		const res = await runJob(WORKER_POOL, { module });
		module.configSchema = res.moduleConfigSchema;
	} else {
		// No config
		module.configSchema = {
			"$schema": "http://json-schema.org/draft-07/schema#",
			"$ref": "#/definitions/Config",
			"definitions": {
				"Config": {
					"type": "null",
				},
			},
		};
	}

	// Validate config
	const moduleConfigAjv = new Ajv.default({
		schemas: [module.configSchema],
	});

	const moduleConfigSchema = moduleConfigAjv.getSchema(
		"#/definitions/Config",
	);
	if (!moduleConfigSchema) {
		throw new Error("Failed to get module config schema");
	}

	if (!moduleConfigSchema(module.userConfig)) {
		throw new Error(
			`Invalid module config:\n${JSON.stringify(module.userConfig)}\n${JSON.stringify(moduleConfigSchema.errors)}`,
		);
	}
}
