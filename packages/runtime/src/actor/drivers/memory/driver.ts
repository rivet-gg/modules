// This file is only imported when the runtime is `deno`
//
import { ModuleContextParams } from "../../../context.ts";
import { ActorContext, appendTraceEntry, Config, Environment, Runtime, Trace } from "../../../mod.ts";
import { RegistryCallMap } from "../../../proxy.ts";
import { ActorBase } from "../../actor.ts";
import { ActorDriver, CallOpts, CreateOpts, DestroyOpts, ExistsOpts, GetOrCreateAndCallOpts } from "../../driver.ts";
import { MemoryInstance } from "./instance.ts";
import { MemorySchedule } from "./schedule.ts";
import { MemoryStorage } from "./storage.ts";

export interface ActorRecord {
	moduleName: string;
	actorName: string;
	instanceName: string;
	state?: string;
	storage: Map<string, string>;
}

export interface ActorInstance {
	actor: ActorBase<any, any>;
	createdAt: number;
	accessedAt: number;
}

export class MemoryActorDriver implements ActorDriver {
	private runtime: Runtime<ModuleContextParams>;
	private encoder = new TextEncoder();

	/**
	 * List of persistent actor data. This is the data that is durable and
	 * outlives actor instances.
	 *
	 * Running actors are stored in `actorInstances`.
	 */
	private actorRecords = new Map<string, ActorRecord>();

	/**
	 * List of all actors that are currently running. These are instantiated on
	 * demand with `getOrCreateActorInstance`.
	 *
	 * This is always a subset of `actorRegistry`.
	 */
	private actorInstances = new Map<string, ActorInstance>();

	public constructor(
		public readonly env: Environment,
		public readonly config: Config,
		private dependencyCaseConversionMap: RegistryCallMap,
		private actorDependencyCaseConversionMap: RegistryCallMap,
	) {
		this.runtime = new Runtime(
			this.env,
			this.config,
			this,
			this.dependencyCaseConversionMap,
			this.actorDependencyCaseConversionMap,
		);
	}

	async createActor({ moduleName, actorName, instanceName, input, trace }: CreateOpts): Promise<void> {
		const id = await this.getId(moduleName, actorName, instanceName);

		// Ensure doesn't already exist
		if (this.actorRecords.has(await this.getId(moduleName, actorName, instanceName))) {
			throw new Error("actor already created");
		}

		// Build drivers
		const actorRecord: ActorRecord = {
			moduleName,
			actorName,
			instanceName,
			state: undefined,
			storage: new Map(),
		};

		// TODO: cache init actor in memory
		// Run actor function
		const { actor } = await this.getOrCreateActorInstance(actorRecord, true);
		const context = this.createActorContext(
			moduleName,
			actorName,
			appendTraceEntry(trace, { actorInitialize: { module: moduleName, actor: actorName } }),
		);
		let initRes = actor.initialize(context, input);
		if (initRes instanceof Promise) initRes = await initRes;

		// Sanitize state & save state
		const stateString = JSON.stringify(initRes);
		actor.state = JSON.parse(stateString);
		actorRecord.state = stateString;

		// Save actor
		this.actorRecords.set(id, actorRecord);
	}

	async callActor({ moduleName, actorName, instanceName, fn, request, trace }: CallOpts): Promise<unknown> {
		const actorRecord = await this.getRecord(moduleName, actorName, instanceName);
		const { actor } = await this.getOrCreateActorInstance(actorRecord, false);

		const context = this.createActorContext(
			moduleName,
			actorName,
			appendTraceEntry(trace, { actorCall: { module: moduleName, actor: actorName, fn } }),
		);

		// Run actor function
		let callRes = (actor as any)[fn](context, request);
		if (callRes instanceof Promise) callRes = await callRes;

		// Sanitize state & save state
		const stateString = JSON.stringify(actor.state);
		actor.state = JSON.parse(stateString);
		actorRecord.state = stateString;

		return callRes;
	}

	async getOrCreateAndCallActor(
		{ moduleName, actorName, instanceName, input, fn, request, trace }: GetOrCreateAndCallOpts,
	): Promise<unknown> {
		// Create actor if needed
		if (!this.actorRecords.has(await this.getId(moduleName, actorName, instanceName))) {
			await this.createActor({ moduleName, actorName, instanceName, input, trace });
		}

		// Call actor
		const callRes = await this.callActor({ moduleName, actorName, instanceName, fn, request, trace });

		return callRes;
	}

	async actorExists({ moduleName, actorName, instanceName }: ExistsOpts): Promise<boolean> {
		return this.actorRecords.has(await this.getId(moduleName, actorName, instanceName));
	}

	async destroyActor({ moduleName, actorName, instanceName }: DestroyOpts): Promise<void> {
		// TODO: Does not handle cancelling timeouts correctly
		const id = await this.getId(moduleName, actorName, instanceName);
		this.actorRecords.delete(id);
		if (this.actorInstances.has(id)) {
			this.actorInstances.get(id)!.actor.destroyed = true;
			this.actorInstances.delete(id);
		}
	}

	private async getId(moduleName: string, actorName: string, instanceName: string) {
		const module = this.config.modules[moduleName]!;
		const actor = module.actors[actorName]!;
		const name = `%%${module.storageAlias}%%${actor.storageAlias}%%${instanceName}`;
		return await this.hash(name);
	}

	private async getRecord(moduleName: string, actorName: string, instanceName: string): Promise<ActorRecord> {
		const record = this.actorRecords.get(await this.getId(moduleName, actorName, instanceName));
		if (!record) throw new Error("Actor not created");
		return record;
	}

	/**
	 * Gets a running instance or creates one on demand.
	 *
	 * `init` is true if calling `initialize` and `state` is undefined.
	 */
	private async getOrCreateActorInstance(record: ActorRecord, init: boolean): Promise<ActorInstance> {
		// Create actor instance
		if (!init && record.state === undefined) throw Error("actor state not initiated");

		// Get actor config
		if (!(record.moduleName in this.config.modules)) throw new Error("module not found");
		const moduleConfig = this.config.modules[record.moduleName]!;
		if (!(record.actorName in moduleConfig.actors)) throw new Error("actor not found");
		const actorConfig = moduleConfig.actors[record.actorName]!;

		// Run actor function
		const actorId = await this.getId(record.moduleName, record.actorName, record.instanceName);
		if (this.actorInstances.has(actorId)) {
			// Instance exists

			const instance = this.actorInstances.get(actorId)!;
			instance.accessedAt = Date.now();
			return instance;
		} else {
			// New instance

			const actor = new (actorConfig.actor)(
				new MemoryInstance(this, record),
				new MemoryStorage(record),
				new MemorySchedule(this, record),
			);
			actor.state = record.state ? JSON.parse(record.state!) : undefined;
			const instance = {
				actor,
				createdAt: Date.now(),
				accessedAt: Date.now(),
			};
			this.actorInstances.set(actorId, instance);
			return instance;
		}
	}

	private createActorContext(moduleName: string, actorName: string, trace: Trace): ActorContext<ModuleContextParams> {
		// Build context
		const module = this.config.modules[moduleName]!;
		const context = new ActorContext<ModuleContextParams>(
			this.runtime,
			trace,
			moduleName,
			this.runtime.postgres.getOrCreatePrismaClient(this.runtime.env, this.runtime.config, module),
			module.db?.schema,
			actorName,
			this.dependencyCaseConversionMap,
			this.actorDependencyCaseConversionMap,
		);

		return context;
	}

	private async hash(input: string) {
		const data = this.encoder.encode(input);
		const hash = await crypto.subtle.digest("SHA-256", data);
		const hashString = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");

		return hashString;
	}
}

export { MemoryActorDriver as ActorDriver };
