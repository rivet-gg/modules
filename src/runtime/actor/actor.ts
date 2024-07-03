import { ModuleContextParams } from "../context.ts";
import { errorToLogEntries, log } from "../logger.ts";
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
	protected runInBackground(promise: Promise<void>) {
		// TODO: Pass this to the actor driver

		promise
			.then(() => log("trace", "actor background promise complete"))
			.catch((err) => log("error", "actor background promise failed", ...errorToLogEntries("error", err)));
	}
}
