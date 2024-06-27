import base64 from "https://deno.land/x/b64@1.1.28/src/base64.js";

type InputData = ArrayBufferLike | Uint8Array | string;

async function secretToKey(secret: string) {
	const secretDigest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(secret),
	);
	return await crypto.subtle.importKey(
		"raw",
		secretDigest,
		"AES-GCM",
		false,
		["encrypt", "decrypt"],
	);
}

export async function tokenToState(
	oauthSecret: string,
	flowToken: string,
): Promise<ArrayBufferLike> {
	const nonce = crypto.getRandomValues(new Uint8Array(12));
	const encodedToken = new TextEncoder().encode(flowToken);
	const oauthSecretKey = await secretToKey(oauthSecret);

	const ciphertext = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: nonce,
			additionalData: new Uint8Array(0),
			tagLength: 128,
		},
		oauthSecretKey,
		encodedToken,
	);

	const state = new Uint8Array(nonce.length + ciphertext.byteLength);
	state.set(nonce);
	state.set(new Uint8Array(ciphertext), nonce.length);

	return state.buffer;
}

export async function tokenToStateStr(
	oauthSecret: string,
	flowToken: string,
): Promise<string> {
	return base64.fromArrayBuffer(await tokenToState(oauthSecret, flowToken));
}

export async function extractTokenFromState(
	oauthSecret: string,
	state: string,
): Promise<string> {
	const stateBuf = base64.toArrayBuffer(state);
	const nonce = stateBuf.slice(0, 12);
	const ciphertext = stateBuf.slice(12);

	const oauthSecretKey = await secretToKey(oauthSecret);
	const token = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: nonce,
			additionalData: new Uint8Array(0),
			tagLength: 128,
		},
		oauthSecretKey,
		ciphertext,
	);

	return new TextDecoder().decode(token);
}

/**
 * Compares two buffers for equality in a way that is resistant to timing
 * attacks.
 *
 * @param a The first buffer
 * @param b The second buffer
 * @returns Whether the two buffers are equal
 */
export function compareConstantTime(a: InputData, b: InputData): boolean {
	const bufLikeA = typeof a === "string" ? new TextEncoder().encode(a) : a;
	const bufLikeB = typeof b === "string" ? new TextEncoder().encode(b) : b;

	if (bufLikeA.byteLength !== bufLikeB.byteLength) return false;

	const bufA = new Uint8Array(bufLikeA);
	const bufB = new Uint8Array(bufLikeB);

	let result = 0;
	for (let i = 0; i < bufLikeA.byteLength; i++) {
		result |= bufA[i] ^ bufB[i];
	}
	return result === 0;
}
