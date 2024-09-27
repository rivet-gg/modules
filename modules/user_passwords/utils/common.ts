import base64 from "https://deno.land/x/b64@1.1.28/src/base64.js";

// import { createHash as hashSCrypt } from "./scrypt.ts";
// import { createHash as hashBCrypt } from "./bcrypt.ts";

// import { hashMatches as matchesSCrypt } from "./scrypt.ts";
// import { hashMatches as matchesBCrypt } from "./bcrypt.ts";

// import { createHash as hashArgon2 } from "./argon2.ts";
// import { hashMatches as matchesArgon2 } from "./argon2.ts";

export function toBase64(buffer: ArrayBufferLike) {
	return base64.fromArrayBuffer(new Uint8Array(buffer));
}

export function fromBase64(base64String: string) {
	return base64.toArrayBuffer(base64String);
}

export function generateSalt(bytes: number = 32) {
	return crypto.getRandomValues(new Uint8Array(bytes));
}

export function packHashAndSalt(hash: ArrayBufferLike, salt: ArrayBufferLike) {
	const joined = new Uint8Array(4 + hash.byteLength + salt.byteLength);

	// Write hash length as u32
	joined.set(new Uint8Array(new Uint32Array([hash.byteLength])));

	// Write hash
	joined.set(new Uint8Array(hash), 4);

	// Write salt
	joined.set(new Uint8Array(salt), 4 + hash.byteLength);

	return joined;
}

export function unpackHashAndSalt(packed: ArrayBufferLike) {
	const view = new DataView(packed);

	// Get hash length as u32
	const hashLength = view.getUint32(0);

	// Get hash
	const hash = new Uint8Array(packed.slice(4, 4 + hashLength));

	// Get salt
	const salt = new Uint8Array(packed.slice(4 + hashLength));

	return { hash, salt };
}

export type Algorithm = "bcrypt" | "scrypt" | "argon2";

// Chosen for memory intensiveness due to cloudflare workers
export const ALGORITHM_DEFAULT: Algorithm = "bcrypt";

export function hash(
	password: string,
	algorithm: Algorithm = ALGORITHM_DEFAULT,
): string {
	switch (algorithm) {
		case "argon2":
			// return hashArgon2(password);
			throw new Error("Unimplemented");
		case "bcrypt":
			// return hashBCrypt(password);
			throw new Error("Unimplemented");
		case "scrypt":
			// return hashSCrypt(password);
			throw new Error("Unimplemented");
	}
}

export function hashMatches(
	password: string,
	hash: string,
	algorithm: Algorithm = ALGORITHM_DEFAULT,
): boolean {
	switch (algorithm) {
		case "argon2":
			// return matchesArgon2(password, hash);
			throw new Error("Unimplemented");
		case "bcrypt":
			// return matchesBCrypt(password, hash);
			throw new Error("Unimplemented");
		case "scrypt":
			// return matchesSCrypt(password, hash);
			throw new Error("Unimplemented");
	}
}
