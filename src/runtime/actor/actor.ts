import { ModuleContextParams } from "../context.ts";
<<<<<<< HEAD
import { errorToLogEntries } from "../logger.ts";
=======
import { errorToLogEntries, log } from "../logger.ts";
>>>>>>> 0e67bfb (feat(runtime): implement logfmt logging)
import { ActorContext } from "../mod.ts";
import { ScheduleDriver, StorageDriver } from "./driver.ts";

/**
 * Actor implementation that user-made actors will extend.
 */
export abstract class ActorBase<
	Input,
	State,
> {
	public state!: State;

	private backgroundPromises: Promise<void>[] = [];

	public constructor(
		public readonly storage: StorageDriver,
		public readonly schedule: ScheduleDriver,
	) {}

	public abstract initialize(ctx: ActorContext<ModuleContextParams>, input: Input): State | Promise<State>;

	/**
	 * Runs a promise in the background.
	 *
	 * This allows the actor runtime to ensure that a promise completes while
	 * returning from an RPC request early.
	 */
	protected runInBackground<Params extends ModuleContextParams>(ctx: ActorContext<Params>, promise: Promise<void>) {
		// Add logging to promise and make it non-failable
		const nonfailablePromise = promise
			.then(() => ctx.log.trace("background promise complete"))
			.catch((err) => ctx.log.error("background promise failed", ...errorToLogEntries("error", err)));

		this.backgroundPromises.push(nonfailablePromise);
	}

	/**
	 * Waits for all promises to finish running.
	 */
	public async waitForBackgroundPromises() {
		for (const promise of this.backgroundPromises) {
			await promise;
		}
	}
}
