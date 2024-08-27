import { JsonObject } from "./types/json.ts";
import { UnreachableError } from "./error.ts";
import { log } from "./logger.ts";
import { BuildRuntime } from "./runtime.ts";

/**
 * Provides context about where this script call came from.
 */
export interface Trace extends JsonObject {
	rayId: string;
	entries: TraceEntry[];
}

/**
 * Single entry in the trace.
 */
export interface TraceEntry extends JsonObject {
	requestId: string;
	startedAt: string;
	type: TraceEntryType;
}

/**
 * Infomration about the type of the trace entry.
 */
export type TraceEntryType =
	| { httpRequest: TraceEntryTypeHttpRequest }
	| {
		script: TraceEntryTypeScript;
	}
	| {
		route: TraceEntryTypeRoute;
	}
	| { actorInitialize: TraceEntryTypeActorInitialize }
	| { actorGetOrCreateAndCall: TraceEntryTypeActorCall }
	| { actorCall: TraceEntryTypeActorCall }
	| { actorSchedule: TraceEntryTypeActorSchedule }
	| { test: TraceEntryTypeTest }
	| { internalTest: TraceEntryTypeInternalTest };

export function stringifyTrace(trace: Trace) {
	return trace.entries.map((x) => stringifyTraceEntryType(x.type)).join(" > ");
}

// export function stringifyTraceEntryType(trace: TraceEntryType) {
// 	if ("httpRequest" in trace) {
// 		return "httpRequest";
// 	} else if ("script" in trace) {
// 		const { module, script } = trace.script;
// 		return `script(${module}.${script})`;
// 	} else if ("route" in trace) {
// 		const { module, route } = trace.route;
// 		return `route(${module}.${route})`;
// 	} else if ("actorInitialize" in trace) {
// 		const { module, actor } = trace.actorInitialize;
// 		return `actorInitialize(${module}.${actor})`;
// 	} else if ("actorGetOrCreateAndCall" in trace) {
// 		const { module, actor, fn } = trace.actorGetOrCreateAndCall;
// 		return `actorGetOrCreateAndCall(${module}.${actor}.${fn})`;
// 	} else if ("actorCall" in trace) {
// 		const { module, actor, fn } = trace.actorCall;
// 		return `actorCall(${module}.${actor}.${fn})`;
// 	} else if ("actorSchedule" in trace) {
// 		return "actorSchedule";
// 	} else if ("test" in trace) {
// 		const { module, name } = trace.test;
// 		return `test(${module}.${name})`;
// 	} else if ("internalTest" in trace) {
// 		return "internalTest";
// 	} else {
// 		throw new UnreachableError(trace);
// 	}
// }

export function stringifyTraceEntryType(trace: TraceEntryType) {
	if ("httpRequest" in trace) {
		return "request";
	} else if ("script" in trace) {
		const { module, script } = trace.script;
		return `${module}.${script}`;
	} else if ("route" in trace) {
		const { module, route } = trace.route;
		return `${module}.${route}`;
	} else if ("actorInitialize" in trace) {
		const { module, actor } = trace.actorInitialize;
		return `${module}.${actor}.init`;
	} else if ("actorGetOrCreateAndCall" in trace) {
		const { module, actor, fn } = trace.actorGetOrCreateAndCall;
		return `${module}.${actor}.${fn}`;
	} else if ("actorCall" in trace) {
		const { module, actor, fn } = trace.actorCall;
		return `${module}.${actor}.${fn}`;
	} else if ("actorSchedule" in trace) {
		return "schedule";
	} else if ("test" in trace) {
		const { module, name } = trace.test;
		return `${module}.${name}`;
	} else if ("internalTest" in trace) {
		return "internal";
	} else {
		throw new UnreachableError(trace);
	}
}

export interface TraceEntryTypeHttpRequest extends JsonObject {
	method: string;
	path: string;
	remoteAddress: string;
	headers: { [key: string]: string };
}

export interface TraceEntryTypeScript extends JsonObject {
	module: string;
	script: string;
}

export interface TraceEntryTypeRoute extends JsonObject {
	module: string;
	route: string;
}

export interface TraceEntryTypeActorInitialize extends JsonObject {
	module: string;
	actor: string;
}

export interface TraceEntryTypeActorCall extends JsonObject {
	module: string;
	actor: string;
	fn: string;
}

export interface TraceEntryTypeActorSchedule extends JsonObject {}

export interface TraceEntryTypeTest extends JsonObject {
	module: string;
	name: string;
}

export interface TraceEntryTypeInternalTest extends JsonObject {
}

export function newTrace(entryType: TraceEntryType, runtime: BuildRuntime = BuildRuntime.Deno): Trace {
	const entry: TraceEntry = {
		requestId: crypto.randomUUID(),
		startedAt: new Date().toISOString(),
		type: entryType,
	};

	// Read managed opengb ray id from request header (set by cloudflare)
	let rayId: string;
	if (runtime == BuildRuntime.Cloudflare && "httpRequest" in entry) {
		const rayIdHeader = (entry.httpRequest as TraceEntryTypeHttpRequest).headers["x-opengb-ray-id"];
		if (rayIdHeader) {
			rayId = rayIdHeader;
		} else {
			log("warn", "no x-opengb-ray-id header found");
			// Generate random ray ID
			rayId = crypto.randomUUID();
		}
	} else {
		// Generate random ray ID
		rayId = crypto.randomUUID();
	}

	return {
		rayId,
		entries: [entry],
	};
}

/**
 * Returns a new trace with the given entry appended to it.
 */
export function appendTraceEntry(
	trace: Trace,
	entryType: TraceEntryType,
): Trace {
	const entry: TraceEntry = {
		requestId: crypto.randomUUID(),
		startedAt: new Date().toISOString(),
		type: entryType,
	};

	return {
		rayId: trace.rayId,
		entries: [...trace.entries, entry],
	};
}
