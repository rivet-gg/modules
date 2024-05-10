import base64 from "https://deno.land/x/b64@1.1.28/src/base64.js";

const STATE_BYTES = 16;


type InputData = ArrayBufferLike | Uint8Array | string;

/**
 * Generates a new random `STATE_BYTES`-byte state buffer.
 * 
 * @returns A new random state buffer
 */
export function generateState(): ArrayBufferLike {
    return crypto.getRandomValues(new Uint8Array(STATE_BYTES));
}

/**
 * Generates a new random string with `STATE_BYTES` bytes of entropy.
 */
export function generateStateStr(): string {
    return base64.fromArrayBuffer(generateState());
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
