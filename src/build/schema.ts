import { Module, Project, Script } from "../project/mod.ts";
import { runJob } from "../utils/worker_pool.ts";
import { WorkerRequest, WorkerResponse } from "./schema.worker.ts";
import { createWorkerPool } from "../utils/worker_pool.ts";

const WORKER_POOL = createWorkerPool<WorkerRequest, WorkerResponse>({
	source: import.meta.resolve("./schema.worker.ts"),
	// Leave 1 CPU core free
	count: Math.max(1, navigator.hardwareConcurrency - 1),
});

// TODO: This function is sync
export async function compileSchema(
	project: Project,
	module: Module,
	script: Script,
): Promise<void> {
	const res = await runJob(WORKER_POOL, { script });
	script.requestSchema = res.requestSchema;
	script.responseSchema = res.responseSchema;
}
