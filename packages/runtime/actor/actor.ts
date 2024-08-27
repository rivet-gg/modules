import { ModuleContextParams } from "../context.ts";
import { errorToLogEntries } from "../logger.ts";
import { ActorContext } from "../mod.ts";
import { ActorInstanceDriver, ScheduleDriver, StorageDriver } from "./driver.ts";

/**
 * Actor implementation that user-made actors will extend.
 */
export abstract class ActorBase<
	Input,
	State,
> {
	public state!: State;

	public destroyed: boolean = false;

	private backgroundPromises: Promise<void>[] = [];

	public constructor(
		private readonly instanceDriver: ActorInstanceDriver,
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
		// TODO: Should we force save the state?
		// Add logging to promise and make it non-failable
		const nonfailablePromise = promise
			.then(() => ctx.log.trace("background promise complete"))
			.catch((err) => ctx.log.error("background promise failed", ...errorToLogEntries("error", err)));
		this.instanceDriver.runInBackground(nonfailablePromise);
	}

	/**
	 * Forces the state to get saved.
	 *
	 * This is helpful if running a long task that may fail later or a background
	 * job that updates the state.
	 */
	public async forceSaveState() {
		await this.instanceDriver.forceSaveState();
	}
}
