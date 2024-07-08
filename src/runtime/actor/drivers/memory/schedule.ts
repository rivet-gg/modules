import { newTrace } from "../../../mod.ts";
import { ScheduleDriver } from "../../driver.ts";
import { ActorRecord, MemoryActorDriver } from "./driver.ts";

export class MemorySchedule implements ScheduleDriver {
	constructor(private readonly driver: MemoryActorDriver, private readonly actorRecord: ActorRecord) {}

	after(duration: number, fn: string, request: unknown): void {
		setTimeout(() => {
			this.driver.callActor({
				moduleName: this.actorRecord.moduleName,
				actorName: this.actorRecord.actorName,
				instanceName: this.actorRecord.instanceName,
				fn,
				request,
				trace: newTrace({ actorSchedule: {} }),
			});
		}, duration);
	}

	at(timestamp: number, fn: string, request: unknown): void {
		setTimeout(() => {
			this.driver.callActor({
				moduleName: this.actorRecord.moduleName,
				actorName: this.actorRecord.actorName,
				instanceName: this.actorRecord.instanceName,
				fn,
				request,
				trace: newTrace({ actorSchedule: {} }),
			});
		}, timestamp - Date.now());
	}
}
