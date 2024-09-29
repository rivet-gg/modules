function randomSelection<T>(
	count: number,
	possibilities: T[],
) {
	const buffer = crypto.getRandomValues(new Uint32Array(count));

	const output = [] as T[];
	for (let i = 0; i < count; i++) {
		output.push(possibilities[buffer[i] % possibilities.length]);
	}

	return output;
}

export function generateRandomCodeSecure(
	alphabet: string,
	length: number,
): string {
	return randomSelection(length, alphabet.split("")).join("");
}

export enum SecureIdFormat {
	HEX = "hex",
	BASE_64 = "base64",
	BASE_64_URL = "base64url",
}

const BASE_64_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE_64_URL_ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const HEX_ALPHABET = "0123456789abcdef";
export function genSecureId(
	bits: number = 128,
	format = SecureIdFormat.BASE_64,
): string {
	switch (format) {
		case SecureIdFormat.HEX:
			return generateRandomCodeSecure(HEX_ALPHABET, Math.ceil(bits / 4));

		case SecureIdFormat.BASE_64:
			return generateRandomCodeSecure(BASE_64_ALPHABET, Math.ceil(bits / 6));
		case SecureIdFormat.BASE_64_URL:
			return generateRandomCodeSecure(
				BASE_64_URL_ALPHABET,
				Math.ceil(bits / 6),
			);
	}
}
