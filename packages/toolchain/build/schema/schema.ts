export type SchemaElementType =
	| "unknown"
	| "optional"
	| "date"
	| "string"
	| "number"
	| "boolean"
	| "undefined"
	| "null"
	| "any"
	| "literal"
	| "tuple"
	| "array"
	| "intersection"
	| "union"
	| "nullable"
	| "never"
	| "record"
	| "object";

export interface SchemaElementOptions {
	description?: string;
}

export type AnySchemaElement =
	& (
		| {
			type: SchemaElementType;
		}
		| { type: "literal"; value: AnySchemaElement }
		| { type: "optional"; value: AnySchemaElement }
		| { type: "tuple"; items: AnySchemaElement[] }
		| { type: "array"; items: AnySchemaElement }
		| { type: "intersection"; left: AnySchemaElement; right: AnySchemaElement }
		| { type: "union"; items: AnySchemaElement[] }
		| { type: "nullable"; item: AnySchemaElement }
		| { type: "object"; properties: Record<string, AnySchemaElement> }
	)
	& SchemaElementOptions;

export const schemaElements = {
	unknown: (opts?: SchemaElementOptions) => ({ type: "unknown", ...opts }),
	optional: (value: AnySchemaElement, opts?: SchemaElementOptions) => ({ type: "optional", value, ...opts }),
	date: (opts?: SchemaElementOptions) => ({ type: "date", ...opts }),
	string: (opts?: SchemaElementOptions) => ({ type: "string", ...opts }),
	number: (opts?: SchemaElementOptions) => ({ type: "number", ...opts }),
	boolean: (opts?: SchemaElementOptions) => ({ type: "boolean", ...opts }),
	undefined: (opts?: SchemaElementOptions) => ({ type: "undefined", ...opts }),
	null: (opts?: SchemaElementOptions) => ({ type: "null", ...opts }),
	any: (opts?: SchemaElementOptions) => ({ type: "any", ...opts }),
	never: (opts?: SchemaElementOptions) => ({ type: "never", ...opts }),
	literal: (value: string | number | undefined, opts?: SchemaElementOptions) => ({
		type: "literal",
		value,
		...opts,
	}),
	tuple: (items: AnySchemaElement[], opts?: SchemaElementOptions) => ({ type: "tuple", items, ...opts }),
	array: (item: AnySchemaElement, opts?: SchemaElementOptions) => ({ type: "array", item, ...opts }),
	intersection: (left: AnySchemaElement, right: AnySchemaElement, opts?: SchemaElementOptions) => ({
		type: "intersection",
		left,
		right,
		...opts,
	}),
	union: (items: AnySchemaElement[], opts?: SchemaElementOptions) => ({ type: "union", items, ...opts }),
	nullable: (item: AnySchemaElement, opts?: SchemaElementOptions) => ({ type: "nullable", item, ...opts }),
	object: (properties: Record<string, AnySchemaElement>, opts?: SchemaElementOptions) => ({
		type: "object",
		properties,
		...opts,
	}),
	record: (elementType: AnySchemaElement, opts?: SchemaElementOptions) => ({
		type: "record",
		elementType,
		...opts,
	}),
} satisfies Record<SchemaElementType, (...args: any[]) => AnySchemaElement>;

export type SchemaElementsMap = typeof schemaElements;
export const s = schemaElements;

export function is<Type extends keyof SchemaElementsMap = keyof SchemaElementsMap>(
	type: Type,
	value: AnySchemaElement,
): value is ReturnType<SchemaElementsMap[Type]> {
	return value.type === type;
}
