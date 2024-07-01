import base64 from "https://deno.land/x/b64@1.1.28/src/base64.js";

type InputData = ArrayBufferLike | Uint8Array | string;

/**
 * Normalizes input data to a buffer.
 *
 * Although strings are often used as input data, webcrypto likes buffers a lot
 * more.
 *
 * @param data An {@linkcode InputData} object to convert to a buffer
 * @returns The buffer representation of the input data, encoding strings as UTF-8
 */
function toBuffer(data: InputData): ArrayBufferLike {
    if (typeof data === "string") {
        return new TextEncoder().encode(data);
    } else {
        return data;
    }
}

/**
 * Convert a secret into a WebCrypto-compatible key for AES-GCM encryption.
 *
 * Because `AES-GCM` requires a 256-bit key, this first hashes the secret with
 * `SHA-256`.
 *
 * @param secret The {@linkcode InputData} to convert to a key
 * @returns A key derived from the secret
 */
async function secretToKey(secret: InputData) {
	const secretDigest = await crypto.subtle.digest(
		"SHA-256",
		toBuffer(secret),
	);
	return await crypto.subtle.importKey(
		"raw",
		secretDigest,
		"AES-GCM",
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Generates a `state` parameter containing associated data.
 * 
 * The data is encrypted with a random 12-byte nonce, and the nonce is prepended
 * to the ciphertext. This means that the same data will not encrypt to the same
 * ciphertext, preventing known-plaintext attacks.
 * 
 * @param oauthSecret The secret to use to encrypt the state parameter
 * @param data The data the state parameter should contain
 * @returns A unique state parameter with data only the server can read
 */
export async function dataToState(
	oauthSecret: InputData,
	data: InputData,
): Promise<ArrayBufferLike> {
	const nonce = crypto.getRandomValues(new Uint8Array(12));
	const encodedToken = toBuffer(data);
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

/**
 * Same as {@linkcode dataToState}, but returns the state as a base64 string
 */
export async function dataToStateStr(
	oauthSecret: InputData,
	data: InputData,
): Promise<string> {
    const state = await dataToState(oauthSecret, data);
    return base64.fromArrayBuffer(state);
}

/**
 * Extracts the data from a `state` parameter.
 * 
 * @param oauthSecret The secret to use to decrypt the state parameter
 * @param state The `state` parameter to extract data from
 * @returns The data contained in the state parameter
 */
export async function stateToData(
	oauthSecret: string,
	state: string,
): Promise<Uint8Array> {
	const stateBuf = base64.toArrayBuffer(state);
	const nonce = stateBuf.slice(0, 12);
	const ciphertext = stateBuf.slice(12);

	const oauthSecretKey = await secretToKey(oauthSecret);
	const data = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: nonce,
			additionalData: new Uint8Array(0),
			tagLength: 128,
		},
		oauthSecretKey,
		ciphertext,
	);

    return new Uint8Array(data);
}


/**
 * Same as {@linkcode stateToData}, but returns the data as a string
 */
export async function stateToDataStr(
    oauthSecret: string,
    state: string,
): Promise<string> {
    const data = await stateToData(oauthSecret, state);
    return new TextDecoder().decode(data);
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




