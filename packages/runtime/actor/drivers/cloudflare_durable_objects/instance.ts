import { ActorInstanceDriver } from "../../driver.ts";
import { __GlobalDurableObjectT } from "./global_durable_object.ts";

export class CloudflareDurableObjectsInstance implements ActorInstanceDriver {
	constructor(private readonly durableObject: __GlobalDurableObjectT) {}

	runInBackground(promise: Promise<void>): void {
		this.durableObject.publicCtx.waitUntil(promise);
	}

	async forceSaveState(): Promise<void> {
		this.durableObject.forceSaveState();
	}
}
