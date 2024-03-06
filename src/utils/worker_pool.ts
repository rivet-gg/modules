/**
 * A collection of workers used to run jobs with a max concurrency.
 * 
 * Useful for easily implementing multi-threading by running jobs in the background.
 */
export interface WorkerPool<Req, Res> {
	source: string;
	workers: WorkerInstance[];
	pendingJobs: PendingJob<Req, Res>[];
    shutdown: boolean;
}

interface WorkerInstance {
	/** Web Worker running a job. Lazily initiated. */
	worker?: Worker;
	/** If a job is running on this worker. */
	busy: boolean;
}

interface PendingJob<Req, Res> {
	request: Req;
	resolve: (res: Res) => void;
	reject: (err: ErrorEvent) => void;
}

export interface CreateWorkerOpts {
	source: string;
	count: number;
}

export function createWorkerPool<Req, Res>(
	opts: CreateWorkerOpts,
): WorkerPool<Req, Res> {
	const pool = {
		source: opts.source,
		workers: Array.from(
			{ length: opts.count },
			() => ({ busy: false, worker: undefined }),
		),
		pendingJobs: [],
        shutdown: false,
	};
	ALL_POOLS.add(pool);
	return pool;
}

export function runJob<Req, Res>(
	pool: WorkerPool<Req, Res>,
	request: Req,
): Promise<Res> {
	return new Promise<Res>((resolve, reject) => {
		pool.pendingJobs.push({ request, resolve, reject });
		tickPool(pool);
	});
}

/**
 * Runs all pending jobs on any available workers.
 *
 * Called any time a worker becomes available or a job is pushed to the pool.
 */
function tickPool<Req, Res>(pool: WorkerPool<Req, Res>) {
    if (pool.shutdown) throw new Error("Pool is shut down");

	while (true) {
        // console.log(`Tick pool (workers: ${pool.workers.filter(w => !w.busy).length}/${pool.workers.length}, pendingJobs: ${pool.pendingJobs.length})`);

		// Find available worker
		const availableWorker = pool.workers.find((worker) => !worker.busy);
		if (!availableWorker) {
			return;
		}

		// Get next job
		const nextJob = pool.pendingJobs.shift();
		if (!nextJob) {
			return;
		}

		// Create worker
		if (!availableWorker.worker) {
			availableWorker.worker = new Worker(pool.source, { type: "module" });
		}

		// Run job
		availableWorker.busy = true;
		availableWorker.worker.onmessage = (ev) => {
			const res = ev.data as Res;
			nextJob.resolve(res);
			availableWorker.busy = false;
			tickPool(pool);
		};
		availableWorker.worker.onerror = (err) => {
			nextJob.reject(err);
			availableWorker.busy = false;
			tickPool(pool);
		};
		availableWorker.worker.postMessage(nextJob.request);
	}
}

export function shutdownPool(pool: WorkerPool<unknown, unknown>) {
    pool.shutdown = true;
	for (const worker of pool.workers) {
		if (worker.worker) {
			worker.worker.terminate();
            worker.worker = undefined;
		}
	}
	ALL_POOLS.delete(pool);
}

/** Registry of all active pools. Used to shut down any workers still running. */
const ALL_POOLS: Set<WorkerPool<unknown, unknown>> = new Set();

export function shutdownAllPools() {
	for (const pool of ALL_POOLS) {
		shutdownPool(pool);
	}
}
