import { LogEntry, LogLevel, logRaw } from "../../../logger.ts";
import { ActorContext, deserializeError, SerializedErrorType, serializeError, UnreachableError } from "../../../mod.ts";

/**
 * Returned from any RPC call to a durable object.
 */
export interface RpcOutput<T> {
	result: RpcResult<T>;
	logs: [LogLevel, LogEntry[]][];
}

export type RpcResult<T> = { ok: T } | { error: SerializedErrorType };

/**
 * Capture logs & output and send it in RPC response.
 */
export async function captureRpcOutput<T>(ctx: ActorContext<any>, fn: () => Promise<T>): Promise<RpcOutput<T>> {
	let finished = false;

	// Capture logs
	const logs: [LogLevel, LogEntry[]][] = [];
	ctx.log.addListener((level, entry) => {
		if (!finished) {
			logs.push([level, entry]);
		}
	});

	// Run function & capture logs
	let result: RpcResult<T>;
	try {
		const ok = await fn();
		result = { ok };
	} catch (error) {
		result = {
			error: serializeError(error),
		};
	}
	finished = true;

	// Build output
	return {
		result,
		logs,
	};
}

/**
 * Re-logs & re-throws errors from an RPC call.
 */
export function handleRpcOutput<T>(output: RpcOutput<T>): T {
	// Re-log all logs that were logged on the durable object
	//
	// We do this bc we currently can't collect logs on a DO with the tail worker
	for (const [logLevel, logEntries] of output.logs) {
		logRaw(logLevel, ...logEntries);
	}

	// Handle result
	if ("ok" in output.result) {
		return output.result.ok;
	} else if ("error" in output.result) {
		throw deserializeError(output.result.error);
	} else {
		throw new UnreachableError(output.result);
	}
}
