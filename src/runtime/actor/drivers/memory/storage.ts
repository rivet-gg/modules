import { StorageDriver } from "../../driver.ts";
import { ActorRecord } from "./driver.ts";

export class MemoryStorage implements StorageDriver {
	constructor(private readonly actorRecord: ActorRecord) {}

	async get<V>(key: string): Promise<V | undefined> {
		const value = this.actorRecord.storage.get(key);
		if (value) return JSON.parse(value);
		else return undefined;
	}

	async put<V>(key: string, value: V): Promise<void> {
		this.actorRecord.storage.set(key, JSON.stringify(value));
	}

	async delete(key: string): Promise<void> {
		this.actorRecord.storage.delete(key);
		throw new Error("Method not implemented.");
	}
}
