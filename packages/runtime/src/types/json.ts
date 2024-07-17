/**
 * A JSON type that can be clealy serialized to/from JSON.
 */
export declare type JsonValue =
	| string
	| number
	| boolean
	| JsonObject
	| JsonArray
	| null;

/**
 * A JSON array that can be clealy serialized to/from JSON.
 */
export declare interface JsonArray extends Array<JsonValue> {
}

/**
 * A JSON object that can be clealy serialized to/from JSON.
 */
export declare type JsonObject = {
	[Key in string]?: JsonValue;
};
