// This file is only imported when the runtime is `cloudflare_workers_platform`.

import { Config, Environment } from "../../../mod.ts";
import { ActorDriver, CallOpts, CreateOpts, DestroyOpts, ExistsOpts, GetOrCreateAndCallOpts } from "../../driver.ts";
import { handleRpcOutput } from "./rpc_output.ts";
export { buildGlobalDurableObjectClass } from "./global_durable_object.ts";

export class CloudflareDurableObjectsActorDriver implements ActorDriver {
	public constructor(public readonly env: Environment, public readonly config: Config) {}

	async createActor(opts: CreateOpts): Promise<void> {
		const stub = this.getStub(opts.moduleName, opts.actorName, opts.instanceName);
		return handleRpcOutput(
			await stub.init({
				module: opts.moduleName,
				actor: opts.actorName,
				instance: opts.instanceName,
				input: opts.input,
				trace: opts.trace,
			}),
		);
	}

	async callActor(opts: CallOpts): Promise<unknown> {
		const stub = this.getStub(opts.moduleName, opts.actorName, opts.instanceName);

		// HACK: Fixes "Type instantiation is excessively deep and possibly infinite."
		return handleRpcOutput(
			await stub.callRpc({
				fn: opts.fn,
				request: opts.request,
				trace: opts.trace,
			}),
		);
	}

	async getOrCreateAndCallActor(opts: GetOrCreateAndCallOpts): Promise<unknown> {
		const stub = this.getStub(opts.moduleName, opts.actorName, opts.instanceName);

		// HACK: Fixes "Type instantiation is excessively deep and possibly infinite."
		return handleRpcOutput(
			await stub.getOrCreateAndCallRpc({
				init: {
					module: opts.moduleName,
					actor: opts.actorName,
					instance: opts.instanceName,
					input: opts.input,
					trace: opts.trace,
				},
				fn: opts.fn,
				request: opts.request,
				trace: opts.trace,
			}),
		);
	}

	async actorExists(opts: ExistsOpts): Promise<boolean> {
		// TODO: Mark the actor base as destroyed
		const stub = this.getStub(opts.moduleName, opts.actorName, opts.instanceName);
		return await stub.initialized();
	}

	async destroyActor(opts: DestroyOpts): Promise<void> {
		const stub = this.getStub(opts.moduleName, opts.actorName, opts.instanceName);
		await stub.destroy();
	}

	private getStub(
		moduleName: string,
		actorName: string,
		instanceName: string,
	): any {
		// TODO: Fix Deno.env.get hack. This does not return a string, it returns an object.
		const ns = this.env.get("__GLOBAL_DURABLE_OBJECT") as any;

		const module = this.config.modules[moduleName]!;
		const actor = module.actors[actorName]!;
		const name = `%%${module.storageAlias}%%${actor.storageAlias}%%${instanceName}`;
		const id = ns.idFromName(name);

		return ns.get(id);
	}
}

export { CloudflareDurableObjectsActorDriver as ActorDriver };
