import { Module, Project, Script } from "../project/mod.ts";
import { runJob } from "../utils/worker_pool.ts";
import { WorkerRequest, WorkerResponse } from "./script_schema.worker.ts";
import { createWorkerPool } from "../utils/worker_pool.ts";

const WORKER_POOL = createWorkerPool<WorkerRequest, WorkerResponse>({
	source: import.meta.resolve("./script_schema.worker.ts"),
});

export async function compileScriptSchema(
	_project: Project,
	_module: Module,
	script: Script,
	onStart: () => void,
): Promise<void> {
	const res = await runJob({ pool: WORKER_POOL, request: { script }, onStart });
	script.requestSchema = res.requestSchema;
	script.responseSchema = res.responseSchema;
}
