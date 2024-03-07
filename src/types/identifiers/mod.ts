import { IdentType, printableAsciiRegex, regexes } from "./defs.ts";
import { IdentError } from "./errors.ts";

export function validateIdentifier(
	ident: string,
	identType: IdentType,
): IdentError | null {
	if (ident.length < 1 || ident.length > 32) {
		return new IdentError("must be between 1 and 32 characters", ident);
	}

	if (!printableAsciiRegex.test(ident)) {
		return new IdentError("must contain only printable ASCII characters", ident);
	}

	const regex = regexes[identType];
	if (!regex.test(ident)) {
		return new IdentError(`must be ${identType} (match the pattern ${regex})`, ident);
	}

	return null;
}
