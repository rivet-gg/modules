export enum IdentType {
	ModuleScripts = "snake_case",
	Errors = "SCREAMING_SNAKE_CASE",
}

/**
 * A record of regular expressions for each identifier type.
 *
 * `regexes[identType].test(ident)` will return whether `ident` is a valid
 * `identType`.
 */
export const regexes: Record<IdentType, RegExp> = {
	[IdentType.ModuleScripts]: /^[a-z]+(_[a-z0-9]+)*$/,
	[IdentType.Errors]: /^[A-Z]+(_[A-Z0-9]+)*$/,
};

/**
 * A regular expression that matches a string of only printable ASCII
 * characters.
 *
 * Printable ASCII characters range from 0x20 to 0x7e, or space to tilde.
 */
export const printableAsciiRegex = /^[\x20-\x7E]+$/;
