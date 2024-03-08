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
	if (await exists(configPath(module))) {
		const res = await runJob(WORKER_POOL, { module });
		module.configSchema = res.moduleConfigSchema;

		// TODO: Validate schema
	} else {
		// TODO: Assert there is no config
	}
}
