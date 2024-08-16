/// <reference types="npm:@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";
import { CloudflareDurableObjectsStorage } from "./storage.ts";
import { CloudflareDurableObjectsSchedule } from "./schedule.ts";
import { ActorBase } from "../../actor.ts";
import {
	ActorContext,
	appendTraceEntry,
	Config,
	Environment,
	ModuleContextParams,
	Runtime,
	Trace,
} from "../../../mod.ts";
import { RegistryCallMap } from "../../../proxy.ts";
import { ActorDriver } from "./driver.ts";
import { newTrace } from "../../../trace.ts";
import { errorToLogEntries, log } from "../../../logger.ts";
import { captureRpcOutput, RpcOutput } from "./rpc_output.ts";
import { CloudflareDurableObjectsInstance } from "./instance.ts";

const KEYS = {
	META: {
		MODULE: "meta:module",
		ACTOR: "meta:actor",
		CREATED_AT: "meta:created_at",
	},
	SCHEDULE: {
		SCHEDULE: "schedule:schedule",
		EVENT_PREFIX: "schedule:event:",
		event(id: string): string {
			return `${this.EVENT_PREFIX}${id}`;
		},
	},
	STATE: "state",
};

interface ScheduleState {
	// Sorted by timestamp asc
	events: ScheduleIndexEvent[];
}

interface ScheduleIndexEvent {
	timestamp: number;
	eventId: string;
}

interface ScheduleEvent {
	timestamp: number;
	fn: string;
	request: unknown;
}

// MARK: TODO:
interface InitOpts {
	module: string;
	actor: string;
	instance: string;
	input: any;
	trace: Trace;
	ignoreAlreadyInitialized?: boolean;
}

interface GetOrCreateAndCallOpts {
	init: InitOpts;
	fn: string;
	request: unknown;
	trace: Trace;
}

interface CallRpcOpts {
	fn: string;
	request: unknown;
	trace: Trace;
}

/*
 * __GlobalDurableObject type used for referencing an instance of the class.
 */
export interface __GlobalDurableObjectT extends DurableObject {
	// ALlow accessing from ActorInstanceDriver
	readonly publicCtx: DurableObjectState;

	// Called over network
	init(opts: InitOpts): Promise<RpcOutput<void>>;
	initialized(): Promise<boolean>;
	destroy(): Promise<void>;
	getOrCreateAndCallRpc(opts: GetOrCreateAndCallOpts): Promise<RpcOutput<any>>;
	callRpc({ fn, request }: CallRpcOpts): Promise<RpcOutput<any>>;

	// Called internally
	scheduleEvent(timestamp: number, fn: string, request: unknown): Promise<void>;
	alarm(): Promise<void>;
	get storage(): DurableObjectStorage;
	forceSaveState(): Promise<void>;
}

/**
 * Actor data & config read from the actor state.
 */
interface ActorMeta {
	moduleName: string;
	actorName: string;
}

/**
 * Generate a __GlobalDurableObject class that has access to the current config.
 *
 * We have to pass the config like this since the config's import is
 * dynamically generated in entrypoint.ts.
 *
 * Doing this instead of setting a static `__GlobalDurableObject.config = xxxx`
 * is better since it ensures that you _can't_ create an instance of
 * __GlobalDurableObject that doesn't have an associated config.
 */
export function buildGlobalDurableObjectClass(
	config: Config,
	dependencyCaseConversionMap: RegistryCallMap,
	actorDependencyCaseConversionMap: RegistryCallMap,
) {
	class __GlobalDurableObject extends DurableObject implements __GlobalDurableObjectT {
		private runtime: Runtime<ModuleContextParams>;

		private actorInstance?: ActorBase<unknown, unknown>;

		/** This will be incremented on destroy. Useful for checking if there was a race condition between a task & destroy. */
		private generation: number = 0;

		constructor(ctx: DurableObjectState, env: unknown) {
			super(ctx, env);

			const envAdapter: Environment = {
				get(key: string): string | undefined {
					return (env as any)[key];
				},
			};

			this.runtime = new Runtime(
				envAdapter,
				config,
				new ActorDriver(envAdapter, config),
				dependencyCaseConversionMap,
				actorDependencyCaseConversionMap,
			);
		}

		get publicCtx(): DurableObjectState {
			return this.ctx;
		}

		/**
		 * Reads the metadata related to this actor from storage.
		 *
		 * This data is set in `init`.
		 */
		async getMeta(): Promise<ActorMeta> {
			// Create actor instance
			const storageRes = await this.ctx.storage.get<string>([KEYS.META.MODULE, KEYS.META.ACTOR, KEYS.STATE]);
			const moduleName = storageRes.get(KEYS.META.MODULE);
			const actorName = storageRes.get(KEYS.META.ACTOR);
			const state = storageRes.get(KEYS.STATE);
			if (moduleName == undefined || actorName == undefined) throw new Error("actor not initialized");
			if (state == undefined) throw Error("actor state not initiated");

			return { moduleName, actorName };
		}

		private async constructActor(
			context: ActorContext<ModuleContextParams>,
			meta: ActorMeta,
		): Promise<ActorBase<unknown, unknown>> {
			const generation = this.generation;

			// Actor already running
			if (this.actorInstance) return this.actorInstance;

			// Get actor config
			if (!(meta.moduleName in config.modules)) throw new Error(`module not found: ${meta.moduleName}`);
			const moduleConfig = config.modules[meta.moduleName]!;
			if (!(meta.actorName in moduleConfig.actors)) {
				throw new Error(`actor not found: ${meta.moduleName}.${meta.actorName}`);
			}
			const actorConfig = moduleConfig.actors[meta.actorName]!;

			// Read state
			const state = await this.ctx.storage.get<string>(KEYS.STATE);
			this.assertGeneration(generation);

			// TODO: use ctx.waitUntil for all calls
			// Construct actor
			const actor = context.runBlockSync(() => {
				return new (actorConfig.actor)(
					new CloudflareDurableObjectsInstance(this),
					new CloudflareDurableObjectsStorage(this),
					new CloudflareDurableObjectsSchedule(this),
				);
			});
			actor.state = state != undefined ? JSON.parse(state) : undefined;
			this.actorInstance = actor;

			return actor;
		}

		private createActorContext(moduleName: string, actorName: string, trace: Trace): ActorContext<ModuleContextParams> {
			// Build context
			const module = config.modules[moduleName]!;
			const context = new ActorContext<ModuleContextParams>(
				this.runtime,
				trace,
				moduleName,
				this.runtime.postgres.getOrCreatePrismaClient(this.runtime.env, this.runtime.config, module),
				module.db?.schema,
				actorName,
				dependencyCaseConversionMap,
				actorDependencyCaseConversionMap,
			);

			return context;
		}

		async init(opts: InitOpts): Promise<RpcOutput<void>> {
			const context = this.createActorContext(
				opts.module,
				opts.actor,
				appendTraceEntry(opts.trace, { actorInitialize: { module: opts.module, actor: opts.actor } }),
			);
			return await captureRpcOutput(context, async () => {
				this.initInner(context, opts);
			});
		}

		async initInner(context: ActorContext<ModuleContextParams>, opts: InitOpts): Promise<{ meta: ActorMeta }> {
			const generation = this.generation;

			// Check if already initialized
			if (await this.initialized()) {
				if (opts.ignoreAlreadyInitialized) {
					return {
						meta: await this.getMeta(),
					};
				} else {
					throw new Error("already initialized");
				}
			}
			this.assertGeneration(generation);

			// Store metadata
			await this.ctx.storage.put({
				[KEYS.META.MODULE]: opts.module,
				[KEYS.META.ACTOR]: opts.actor,
				[KEYS.META.CREATED_AT]: Date.now(),
			});
			this.assertGeneration(generation);

			// Build initial state
			const actor = await this.constructActor(context, {
				moduleName: opts.module,
				actorName: opts.actor,
			});
			this.assertGeneration(generation);
			const state = await context.runBlock(async () => {
				let state = actor.initialize(context, opts.input);
				if (state instanceof Promise) state = await state;
				return state;
			});
			this.assertGeneration(generation);
			actor.state = state;
			await this.ctx.storage.put(KEYS.STATE, JSON.stringify(state));
			this.assertGeneration(generation);

			return {
				meta: {
					moduleName: opts.module,
					actorName: opts.actor,
				},
			};
		}

		async initialized(): Promise<boolean> {
			return await this.ctx.storage.get(KEYS.META.MODULE) != undefined;
		}

		async destroy(): Promise<void> {
			this.generation++;
			this.actorInstance = undefined;
			await this.ctx.storage.deleteAll();
			await this.ctx.storage.deleteAlarm();
			await this.ctx.storage.sync();
		}

		async getOrCreateAndCallRpc(opts: GetOrCreateAndCallOpts): Promise<RpcOutput<any>> {
			const context = this.createActorContext(
				opts.init.module,
				opts.init.actor,
				appendTraceEntry(opts.trace, {
					actorGetOrCreateAndCall: { module: opts.init.module, actor: opts.init.actor, fn: opts.fn },
				}),
			);
			return await captureRpcOutput(context, async () => {
				return this.getOrCreateAndCallRpcInner(context, opts);
			});
		}

		async getOrCreateAndCallRpcInner(
			context: ActorContext<ModuleContextParams>,
			opts: GetOrCreateAndCallOpts,
		): Promise<any> {
			const generation = this.generation;

			const { meta } = await this.initInner(context, {
				...opts.init,
				ignoreAlreadyInitialized: true,
			});
			this.assertGeneration(generation);

			return await this.callRpcInner(context, meta, { fn: opts.fn, request: opts.request, trace: opts.trace });
		}

		async callRpc(opts: CallRpcOpts): Promise<RpcOutput<any>> {
			const meta = await this.getMeta();

			const context = this.createActorContext(
				meta.moduleName,
				meta.actorName,
				appendTraceEntry(opts.trace, { actorCall: { module: meta.moduleName, actor: meta.actorName, fn: opts.fn } }),
			);

			return await captureRpcOutput(context, async () => {
				return this.callRpcInner(context, meta, opts);
			});
		}

		async callRpcInner(context: ActorContext<ModuleContextParams>, meta: ActorMeta, opts: CallRpcOpts): Promise<any> {
			const generation = this.generation;

			const actor = await this.constructActor(context, meta);
			this.assertGeneration(generation);

			try {
				// Call fn
				const callRes = await context.runBlock(async () => {
					let callRes = (actor as any)[opts.fn](context, opts.request);
					if (callRes instanceof Promise) callRes = await callRes;
					return callRes;
				});
				return callRes;
			} finally {
				this.assertGeneration(generation);

				// Update state
				await this.ctx.storage.put(KEYS.STATE, JSON.stringify(actor.state));
				this.assertGeneration(generation);
			}
		}

		async scheduleEvent(timestamp: number, fn: string, request: unknown): Promise<void> {
			const generation = this.generation;

			// Save event
			const eventId = crypto.randomUUID();
			await this.ctx.storage.put<ScheduleEvent>(KEYS.SCHEDULE.event(eventId), {
				timestamp,
				fn,
				request,
			});
			this.assertGeneration(generation);

			// Read index
			const schedule: ScheduleState = await this.ctx.storage.get(KEYS.SCHEDULE.SCHEDULE) ?? { events: [] };
			this.assertGeneration(generation);

			// Insert event in to index
			const newEvent: ScheduleIndexEvent = { timestamp, eventId };
			const insertIndex = schedule.events.findIndex((x) => x.timestamp > newEvent.timestamp);
			if (insertIndex === -1) {
				schedule.events.push(newEvent);
			} else {
				schedule.events.splice(insertIndex, 0, newEvent);
			}

			// Write new index
			await this.ctx.storage.put(KEYS.SCHEDULE.SCHEDULE, schedule);
			this.assertGeneration(generation);

			// Update alarm if:
			// - this is the newest event (i.e. at beginning of array) or
			// - this is the only event (i.e. the only event in the array)
			if (insertIndex == 0 || schedule.events.length == 1) {
				await this.ctx.storage.setAlarm(newEvent.timestamp);
			}
		}

		override async alarm(): Promise<void> {
			const generation = this.generation;
			const now = Date.now();

			// Read index
			const scheduleIndex: ScheduleState = await this.ctx.storage.get(KEYS.SCHEDULE.SCHEDULE) ?? { events: [] };
			this.assertGeneration(generation);

			// Remove events from schedule
			const runIndex = scheduleIndex.events.findIndex((x) => x.timestamp < now);
			const scheduleIndexEvents = scheduleIndex.events.splice(0, runIndex + 1);

			// Find events to trigger
			const eventKeys = scheduleIndexEvents.map((x) => KEYS.SCHEDULE.event(x.eventId));
			const scheduleEvents = await this.ctx.storage.get<ScheduleEvent>(eventKeys);
			this.assertGeneration(generation);
			await this.ctx.storage.delete(eventKeys);
			this.assertGeneration(generation);

			// Write new schedule
			await this.ctx.storage.put(KEYS.SCHEDULE.SCHEDULE, scheduleIndex);
			this.assertGeneration(generation);

			// Set alarm for next event
			if (scheduleIndex.events.length > 0) {
				await this.ctx.storage.setAlarm(scheduleIndex.events[0]!.timestamp);
				this.assertGeneration(generation);
			}

			// Iterate by event key in order to ensure we call the events in order
			for (const eventKey of eventKeys) {
				const event = scheduleEvents.get(eventKey)!;
				try {
					// TODO: how do we handle this promise cleanly?
					const res = this.callRpc({ fn: event.fn, request: event.request, trace: newTrace({ actorSchedule: {} }) });
					if (res instanceof Promise) await res;
				} catch (err) {
					log("error", "failed to run scheduled event", ["fn", event.fn], ...errorToLogEntries("error", err));
				}
				this.assertGeneration(generation);
			}
		}

		/**
		 * Make storage publicly accessible for use in `StorageDriver`.
		 */
		public get storage(): DurableObjectStorage {
			return this.ctx.storage;
		}

		async forceSaveState(): Promise<void> {
			if (this.actorInstance) {
				await this.ctx.storage.put(KEYS.STATE, this.actorInstance.state);
			}
		}

		/**
		 * Checks if the actor was destroyed by comparing the previous generation.
		 *
		 * Should be called after any async call.
		 */
		private assertGeneration(generation: number) {
			if (this.generation != generation) throw new Error("actor destroyed");
		}
	}

	return __GlobalDurableObject;
}
