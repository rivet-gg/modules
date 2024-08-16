import { ScheduleDriver } from "../../driver.ts";
import { __GlobalDurableObjectT } from "./global_durable_object.ts";

export class CloudflareDurableObjectsSchedule implements ScheduleDriver {
	constructor(private readonly durableObject: __GlobalDurableObjectT) {}

	after(duration: number, fn: string, request: unknown): void {
		this.durableObject.publicCtx.waitUntil(this.durableObject.scheduleEvent(Date.now() + duration, fn, request));
	}
	at(timestamp: number, fn: string, request: unknown): void {
		this.durableObject.publicCtx.waitUntil(this.durableObject.scheduleEvent(timestamp, fn, request));
	}

	async __inspect(): Promise<any> {
		const keys = await this.durableObject.storage.list({ prefix: "schedule:" });
		const alarm = await this.durableObject.storage.getAlarm();
		return {
			keys,
			alarm,
		};
	}
}
