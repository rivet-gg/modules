import { ActorInstanceDriver } from "../../driver.ts";
import { ActorRecord, MemoryActorDriver } from "./driver.ts";

export class MemoryInstance implements ActorInstanceDriver {
	constructor(private readonly driver: MemoryActorDriver, private readonly actorRecord: ActorRecord) {}

	runInBackground(_promise: Promise<void>): void {
		// No action needed
	}

	async forceSaveState(): Promise<void> {
		// TODO:
	}
}
