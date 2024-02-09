/** Validate alphanumeric characters */
export function validateString(input: string): boolean {
	const regex = /^[a-zA-Z0-9_]+$/;
	return regex.test(input);
}

export function assertValidString(input: string): string {
	if (!validateString(input)) {
		throw new Error(`Invalid string: ${input}`);
	}
	return input;
}
