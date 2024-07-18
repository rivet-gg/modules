import { RuntimeError } from "./error.ts";
import { stringifyTrace } from "./mod.ts";

export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type LogEntry = [string, LogValue];
export type LogValue = string | number | boolean | null | undefined;

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
	error: "\x1b[31m", // Red
	warn: "\x1b[33m", // Yellow
	info: "\x1b[32m", // Green
	debug: "\x1b[36m", // Cyan
	trace: "\x1b[35m", // Magenta
};

const RESET_COLOR = "\x1b[0m";

/** Builds the full entries for a log. */
export function buildLogEntries(level: LogLevel, message: string, ...data: LogEntry[]): LogEntry[] {
	return [
		["ts", getFormattedTimestamp()],
		["level", level],
		["msg", message],
		...data,
	];
}

export function log(level: LogLevel, message: string, ...data: LogEntry[]) {
	logRaw(
		level,
		...buildLogEntries(level, message, ...data),
	);
}

export function logRaw(level: LogLevel, ...data: any[]) {
	let message = stringify(...data);

	if (LOGGER_CONFIG.enableColor) {
		message = `${LOG_LEVEL_COLORS[level]}${message}${RESET_COLOR}`;
	}

	originalConsole.log(message);
}

/**
 * Serializes logfmt line using orderer parameters.
 *
 * We use varargs because it's ordered & it has less overhead than an object.
 *
 * ## Styling Methodology
 *
 * The three things you need to know for every log line is the level, the
 * message, and who called it. These properties are highlighted in different colros
 * and sorted in th eorder that you usually read them.
 *
 * Once you've found a log line you care about, then you want to find the
 * property you need to see. The property names are bolded and the default color
 * while the rest of the data is dim. This lets you scan to find the property
 * name quickly then look closer to read the data associated with the
 * property.
 */
export function stringify(...data: LogEntry[]) {
	let line = "";

	for (let i = 0; i < data.length; i++) {
		const [key, valueRaw] = data[i]!;

		let isNull = false;
		let valueString: string;
		if (valueRaw == null) {
			isNull = true;
			valueString = "";
		} else {
			valueString = valueRaw.toString();
		}

		const needsQuoting = valueString.indexOf(" ") > -1 || valueString.indexOf("=") > -1;
		const needsEscaping = valueString.indexOf('"') > -1 || valueString.indexOf("\\") > -1;

		if (needsEscaping) valueString = valueString.replace(/["\\]/g, "\\$&");
		if (needsQuoting || needsEscaping) valueString = '"' + valueString + '"';
		if (valueString === "" && !isNull) valueString = '""';

		if (LOGGER_CONFIG.enableColor) {
			// With color

			// Secial message colors
			let color = "\x1b[2m";
			if (key == "level" && valueString in LOG_LEVEL_COLORS) {
				color = LOG_LEVEL_COLORS[valueString as LogLevel];
			} else if (key == "msg") {
				color = "\x1b[32m";
			} else if (key == "trace") {
				color = "\x1b[34m";
			}

			// Format line
			line += "\x1b[0m\x1b[1m" + key + "\x1b[0m" + "\x1b[2m=\x1b[0m" + color + valueString + RESET_COLOR;
		} else {
			// No color
			line += key + "=" + valueString;
		}

		if (i != data.length - 1) {
			line += " ";
		}
	}

	return line;
}

export function getFormattedTimestamp() {
	const now = new Date();

	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	const day = String(now.getUTCDate()).padStart(2, "0");
	const hours = String(now.getUTCHours()).padStart(2, "0");
	const minutes = String(now.getUTCMinutes()).padStart(2, "0");
	const seconds = String(now.getUTCSeconds()).padStart(2, "0");
	const milliseconds = String(now.getUTCMilliseconds()).padStart(3, "0");

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

function castToLogValue(v: unknown): LogValue {
	if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null || v === undefined) {
		return v;
	}
	return JSON.stringify(v);
}

// Patch console methods
const originalConsole = { ...console };

function consoleLogWrapper(level: LogLevel, ...args: unknown[]) {
	const data: LogEntry[] = args.slice(1).map((v, i) => [`data${i}`, castToLogValue(v)]);
	log(level, args[0] as string, ...data);
}

console.error = consoleLogWrapper.bind(undefined, "error");
console.warn = consoleLogWrapper.bind(undefined, "warn");
console.info = consoleLogWrapper.bind(undefined, "info");
console.log = consoleLogWrapper.bind(undefined, "info");
console.debug = consoleLogWrapper.bind(undefined, "debug");
console.trace = consoleLogWrapper.bind(undefined, "trace");

// MARK: Config
interface GlobalLoggerConfig {
	enableColor: boolean;
	enableSpreadObject: boolean;
	enableErrorStack: boolean;
}

export const LOGGER_CONFIG: GlobalLoggerConfig = {
	enableColor: false,
	enableSpreadObject: false,
	enableErrorStack: false,
};

// MARK: Utils
/**
 * Converts an object in to an easier to read KV of entries.
 */
export function spreadObjectToLogEntries(base: string, data: unknown): LogEntry[] {
	if (
		LOGGER_CONFIG.enableSpreadObject && typeof data == "object" && !Array.isArray(data) && data !== null &&
		Object.keys(data).length != 0 && Object.keys(data).length < 16
	) {
		const logData: LogEntry[] = [];
		for (const key in data) {
			// logData.push([`${base}.${key}`, JSON.stringify((data as any)[key])]);
			logData.push(...spreadObjectToLogEntries(`${base}.${key}`, (data as any)[key]));
		}
		return logData;
	} else {
		return [[base, JSON.stringify(data)]];
	}
}

export function errorToLogEntries(base: string, error: unknown): LogEntry[] {
	if (error instanceof RuntimeError) {
		return [
			[`${base}.code`, error.code],
			[`${base}.description`, error.errorConfig?.description],
			[`${base}.module`, error.moduleName],
			...(error.trace ? [[`${base}.trace`, stringifyTrace(error.trace)] as LogEntry] : []),
			...(LOGGER_CONFIG.enableErrorStack && error.stack
				? [[`${base}.stack`, formatStackTrace(error.stack)] as LogEntry]
				: []),
			...(error.meta ? [[`${base}.meta`, JSON.stringify(error.meta)] as LogEntry] : []),
			...(error.cause ? errorToLogEntries(`${base}.cause`, error.cause) : []),
		];
	} else if (error instanceof Error) {
		return [
			[`${base}.name`, error.name],
			[`${base}.message`, error.message],
			...(LOGGER_CONFIG.enableErrorStack && error.stack
				? [[`${base}.stack`, formatStackTrace(error.stack)] as LogEntry]
				: []),
			...(error.cause ? errorToLogEntries(`${base}.cause`, error.cause) : []),
		];
	} else {
		return [
			[base, `${error}`],
		];
	}
}

/**
 * Formats a JS stack trace in to a legible one-liner.
 */
function formatStackTrace(stackTrace: string): string {
	const regex = /at (.+?)$/gm;
	const matches = [...stackTrace.matchAll(regex)];
	// Reverse array since the OpenGB stack goes from top level -> bottom level
	matches.reverse();
	return matches
		.map((match) => match[1]!.trim())
		.join(" > ");
}
