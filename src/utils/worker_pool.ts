// Leave 1 core free
const MAX_WORKERS = Math.max(1, navigator.hardwareConcurrency - 1);

/**
 * Manages state for all pools.
 */
interface GlobalState {
	/** Registry of all active pools. Used to shut down any workers still running. */
	allPools: Set<WorkerPool<unknown, unknown>>;

	/** Workers currently being ran. */
	activeWorkers: number;

	/** List of jobs that are waiting to be ran when a worker is available. */
	pendingJobs: PendingJob<unknown, unknown>[];

	/** If all pools ahve been shut down. */
	shutdown: boolean;
}

/**
 * A job waiting to be ran on a worker.
 */
interface PendingJob<Req, Res> {
	/** Pool this belongs to. */
	pool: WorkerPool<Req, Res>;

	/** The request data to send to the worker. */
	request: Req;

	/** Resolve promise. */
	resolve: (res: Res) => void;

	/** Reject promise. */
	reject: (err: ErrorEvent) => void;
}

const GLOBAL_STATE: GlobalState = {
	allPools: new Set(),
	activeWorkers: 0,
	pendingJobs: [],
	shutdown: false,
};
/**
 * A collection of workers used to run jobs with a max concurrency.
 *
 * Useful for easily implementing multi-threading by running jobs in the background.
 */
export interface WorkerPool<Req, Res> {
	source: string;
	workers: WorkerInstance[];
	shutdown: boolean;
}

interface WorkerInstance {
	/** Web Worker running a job. */
	worker: Worker;
	/** If a job is running on this worker. */
	busy: boolean;
}

export interface CreateWorkerOpts {
	source: string;
}

export function createWorkerPool<Req, Res>(
	opts: CreateWorkerOpts,
): WorkerPool<Req, Res> {
	if (GLOBAL_STATE.shutdown) throw new Error("Global state is shut down");

	const pool: WorkerPool<Req, Res> = {
		source: opts.source,
		workers: [],
		shutdown: false,
	};
	GLOBAL_STATE.allPools.add(pool);
	return pool;
}

/**
 * Runs a job on a pool once a worker becomes available.
 */
export function runJob<Req, Res>(
	pool: WorkerPool<Req, Res>,
	request: Req,
): Promise<Res> {
	if (pool.shutdown) throw new Error("Pool is shut down");

	return new Promise<Res>((resolve: (x: Res) => void, reject) => {
		const pendingJob: PendingJob<Req, Res> = {
			pool,
			request,
			resolve,
			reject,
		};
		GLOBAL_STATE.pendingJobs.push(pendingJob as PendingJob<unknown, unknown>);
		tickGlobalState();
	});
}

/**
 * Runs all pending jobs on any available workers.
 *
 * Called any time a worker becomes available or a job is pushed to the pool.
 */
function tickGlobalState() {
	if (GLOBAL_STATE.shutdown) throw new Error("Shut down");

	while (true) {
		// console.log(`Tick pool (workers: ${GLOBAL_STATE.activeWorkers}/${THREADS}, pendingJobs: ${GLOBAL_STATE.pendingJobs.length})`);

		// Check if can schedule a job
		if (GLOBAL_STATE.activeWorkers >= MAX_WORKERS) {
			return;
		}

		// Get next job
		const job = GLOBAL_STATE.pendingJobs.shift();
		if (!job) {
			return;
		}

		// Get or create worker
		let worker = job.pool.workers.find((worker) => !worker.busy);
		if (!worker) {
			worker = {
				worker: new Worker(job.pool.source, { type: "module" }),
				busy: false,
			};
			job.pool.workers.push(worker);
		}

		// Run job
		worker.busy = true;
		GLOBAL_STATE.activeWorkers++;
		worker.worker.onmessage = (ev) => {
			const res = ev.data;
			job.resolve(res);
			worker!.busy = false;
			GLOBAL_STATE.activeWorkers--;
			tickGlobalState();
		};
		worker.worker.onerror = (err) => {
			job.reject(err);
			worker!.busy = false;
			GLOBAL_STATE.activeWorkers--;
			tickGlobalState();
		};
		worker.worker.postMessage(job.request);
	}
}

/**
 * Terminates all workers and prevents scheduling new jobs on a pool.
 */
export function shutdownPool(pool: WorkerPool<unknown, unknown>) {
	pool.shutdown = true;
	for (const worker of pool.workers) {
		if (worker.worker) {
			worker.worker.terminate();
		}
	}
	GLOBAL_STATE.allPools.delete(pool);
}

export function shutdownAllPools() {
	GLOBAL_STATE.shutdown = true;
	for (const pool of GLOBAL_STATE.allPools) {
		shutdownPool(pool);
	}
}