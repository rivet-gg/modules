/** Validate alphanumeric characters */
export function validateString(input: string): boolean {
    let regex = /^[a-zA-Z0-9]+$/;
    return regex.test(input);
}

export function assertValidString(input: string): string {
    if (!validateString(input)) {
        throw new Error(`Invalid string: ${input}`);
    }
    return input;
}
