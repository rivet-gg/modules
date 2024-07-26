import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ModuleContext } from "./context.ts";
import { Context } from "./context.ts";
import { fromValidationError } from "./deps.ts";
import { ModuleContextParams } from "./mod.ts";
import { ErrorConfig, Runtime } from "./runtime.ts";
import { Trace } from "./trace.ts";

export const INTERNAL_ERROR_CODE = "internal_error";
export const INTERNAL_ERROR_DESCRIPTION = "Internal error. Read the backend logs for more details.";

const DEFAULT_ERROR_CONFIGS: Record<string, ErrorConfig> = {
	[INTERNAL_ERROR_CODE]: {
		description: INTERNAL_ERROR_DESCRIPTION,
	},
	"unreachable": {
		description: "Unreachable.",
	},
	"validation": {
		description: "The provided data does not match the required schema.",
	},
};

// MARK: Runtime Error
export interface RuntimeErrorOptions extends ErrorOptions {
	internal?: boolean;
	meta?: any;
	statusCode?: number;
}

export class RuntimeError extends Error {
	public moduleName?: string;
	public trace?: Trace;
	public errorConfig?: ErrorConfig;
	public internal: boolean;
	public meta?: any;
	public statusCode: number;

	public constructor(
		public readonly code: string,
		options?: RuntimeErrorOptions,
	) {
		super(code, options);
		this.internal = options?.internal ?? false;
		this.meta = options?.meta;
		this.statusCode = options?.statusCode ?? 500;
	}

	public enrich<
		Params extends ModuleContextParams,
		Ctx extends Context<Params>,
	>(
		runtime: Runtime<Params>,
		context: Ctx,
	) {
		// Add context to error
		if (context instanceof ModuleContext) {
			this.moduleName = context.moduleName;
		}
		if (!this.trace) {
			this.trace = context.trace;
		}

		// Lookup error config if doesn't already exist
		if (!this.errorConfig && this.moduleName) {
			if (this.code in DEFAULT_ERROR_CONFIGS) {
				this.errorConfig = DEFAULT_ERROR_CONFIGS[this.code];
				this.message = `${this.moduleName}[${this.code}]: ${this.errorConfig!.description}`;
			} else {
				const errorConfig = runtime.config.modules[this.moduleName]?.errors[this.code];
				if (errorConfig) {
					this.errorConfig = errorConfig;
					if (errorConfig.description) {
						this.message = `${this.moduleName}[${this.code}]: ${errorConfig.description}`;
					}
				} else {
					context.log.warn(
						"error config not found. if you are the module author, check the error exists in module.json.",
						["errorCode", this.code],
					);
				}
			}
		}

		// Build enriched message
		let message = "";
		if (this.moduleName) {
			message += `${this.moduleName}[${this.code}]`;
		} else {
			message += this.code;
		}
		if (this.errorConfig?.description) {
			message += `: ${this.errorConfig.description}`;
		}
		this.message = message;
	}

	public serialize(): SerializedErrorType {
		return {
			RuntimeError: {
				name: this.name,
				message: this.message,
				stack: this.stack,
				cause: this.cause ? serializeError(this.cause) : undefined,
				code: this.code,
				moduleName: this.moduleName,
				trace: this.trace,
				errorConfig: this.errorConfig,
				meta: this.meta,
				statusCode: this.statusCode,
			},
		};
	}

	public static deserialize(data: RuntimeErrorSerialized, intermediateError?: RuntimeError): RuntimeError {
		// Get or create error
		const error = intermediateError ?? new RuntimeError(data.code, {
			meta: data.meta,
			statusCode: data.statusCode,
		});

		// This data is set in the constructor of the intermediate error
		if (intermediateError === undefined) {
			error.name = data.name;
			error.message = data.message;
		}

		// Overwrite common properties
		error.stack = data.stack;
		if (data.cause) {
			error.cause = deserializeError(data.cause);
		}

		// Assign RuntimeError-specific properties
		error.moduleName = data.moduleName;
		error.trace = data.trace;
		error.errorConfig = data.errorConfig;

		return error;
	}
}

export interface RuntimeErrorSerialized extends ErrorSerialized {
	code: string;
	moduleName?: string;
	trace?: Trace;
	errorConfig?: ErrorConfig;
	meta?: any;
	statusCode: number;
}

// MARK: Unreachable Error
export class UnreachableError extends RuntimeError {
	constructor(public readonly value: never) {
		super("unreachable", { internal: true, meta: { value } });
	}

	public override serialize(): SerializedErrorType {
		const baseData = super.serialize();
		assert("RuntimeError" in baseData);
		const serialized: UnreachableErrorSerialized = {
			...baseData.RuntimeError,
			value: this.value,
		};
		return { UnreachableError: serialized };
	}

	public static override deserialize(data: UnreachableErrorSerialized): UnreachableError {
		const error = new UnreachableError(data.value);
		RuntimeError.deserialize(data, error);
		return error;
	}
}

export interface UnreachableErrorSerialized extends RuntimeErrorSerialized {
	value: never;
}

// MARK: Validation Error
export class ValidationError extends RuntimeError {
	constructor(message: string, public validationError: any) {
		super("validation", {
			meta: {
				error: { ...validationError, name: "ValidationError" },
			},
		});
		this.cause = `${message} ${fromValidationError(validationError).toString()}`;
	}

	public override serialize(): SerializedErrorType {
		const baseData = super.serialize();
		assert("RuntimeError" in baseData);
		const serialized: ValidationErrorSerialized = {
			...baseData.RuntimeError,
			validationError: this.validationError,
		};
		return { ValidationError: serialized };
	}

	public static override deserialize(data: ValidationErrorSerialized): ValidationError {
		const error = new ValidationError(data.message, data.validationError);
		RuntimeError.deserialize(data, error);
		return error;
	}
}

export interface ValidationErrorSerialized extends RuntimeErrorSerialized {
	validationError: any;
}

// MARK: Serialize
export type SerializedErrorType =
	| { Error: ErrorSerialized }
	| { RuntimeError: RuntimeErrorSerialized }
	| { UnreachableError: UnreachableErrorSerialized }
	| { ValidationError: ValidationErrorSerialized };

export interface ErrorSerialized {
	name: string;
	message: string;
	stack?: string;
	cause?: SerializedErrorType;
}

export function serializeError(error: unknown): SerializedErrorType {
	if (error instanceof RuntimeError) {
		return error.serialize();
	} else if (error instanceof Error) {
		return {
			Error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
				cause: error.cause ? serializeError(error.cause) : undefined,
			},
		};
	} else {
		return {
			Error: {
				name: "Error",
				message: `${error}`,
			},
		};
	}
}

export function deserializeError(data: SerializedErrorType): Error {
	if ("UnreachableError" in data) {
		return UnreachableError.deserialize(data.UnreachableError);
	} else if ("ValidationError" in data) {
		return ValidationError.deserialize(data.ValidationError);
	} else if ("RuntimeError" in data) {
		return RuntimeError.deserialize(data.RuntimeError);
	} else if ("Error" in data) {
		const error = new Error(data.Error.message);
		error.name = data.Error.name;
		error.stack = data.Error.stack;
		if (data.Error.cause) {
			error.cause = deserializeError(data.Error.cause);
		}
		return error;
	} else {
		throw new Error("Unknown error type");
	}
}
