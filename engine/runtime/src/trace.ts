/**
 * Provides context about where this script call came from.
 */
export interface Trace {
    rayId: string;
    entries: TraceEntry[];
}

/**
 * Single entry in the trace.
 */
export interface TraceEntry {
    requestId: string;
    startedAt: string;
    type: TraceEntryType;
}

/**
 * Infomration about the type of the trace entry.
 */
export type TraceEntryType  = { httpRequest: TraceEntryType.HttpRequest } | { script: TraceEntryType.Script };

module TraceEntryType {
    export interface HttpRequest {

    }

    export interface Script {
        module: string;
        script: string;
    }
}


