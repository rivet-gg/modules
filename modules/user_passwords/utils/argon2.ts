import {
    hash as hashArgon2,
    Argon2Params,
    Argon2Version,
		Argon2Algorithm,
} from "https://deno.land/x/argontwo@0.2.0/mod.ts";
import { generateSalt } from "./common.ts";
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";
import base64 from "https://deno.land/x/b64@1.1.28/src/base64.js";


// OWASP recommended defaults:
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
const argon2Defaults: Argon2Params = {
    algorithm: "Argon2id",
    version: 19,
    tCost: 2, // 3 iterations
    mCost: 19 * 1024, // 19MiB of memory
    pCost: 1, // 1 thread

    secret: undefined,
    outputLength: 32,
};

export function createHash(password: string) {
    const salt = generateSalt();
    const passwordBuffer = new TextEncoder().encode(password);
    const hash = hashArgon2(passwordBuffer, salt, argon2Defaults);
    return packDigest(hash, salt, argon2Defaults);
}

export function hashMatches(guess: string, digest: string) {
    const { hash, salt, params } = unpackDigest(digest);
    const guessBuffer = new TextEncoder().encode(guess);

    const hashGuess = hashArgon2(guessBuffer, salt, params);

    return timingSafeEqual(hashGuess, hash);
}

function packDigest(hash: ArrayBuffer, salt: ArrayBuffer, params: Argon2Params) {
    const headerPart = `$${params.algorithm.toLowerCase()}$v=${params.version}$`;
    const paramPart = `m=${params.mCost},t=${params.tCost},p=${params.pCost}`;

    const saltBase64 = base64.fromArrayBuffer(salt);
    const hashBase64 = base64.fromArrayBuffer(hash);

    return `${headerPart}${paramPart}$${saltBase64}$${hashBase64}`;
}

const algorithmMap: Record<string, Argon2Algorithm> = {
    "argon2i": "Argon2i",
    "argon2d": "Argon2d",
    "argon2id": "Argon2id",
};

function unpackDigest(digest: string): { hash: ArrayBuffer, salt: ArrayBuffer, params: Argon2Params } {
    const [, algorithmName, versionStr, params, saltStr, hashStr] = digest.split("$");

    const algorithm = algorithmMap[algorithmName];
    const version = parseInt(versionStr.match(/v=(\d+)/)![1]);

    const mCost = parseInt(params.match(/m=(\d+)/)![1]);
    const tCost = parseInt(params.match(/t=(\d+)/)![1]);
    const pCost = parseInt(params.match(/p=(\d+)/)![1]);

    const salt = base64.toArrayBuffer(saltStr);
    const hash = base64.toArrayBuffer(hashStr);


    if (!algorithm || !version || !mCost || !tCost || !pCost || !salt || !hash) {
        throw new Error("Invalid internal hash format");
    }

    return {
        hash,
        salt,
        params: {
            algorithm,
            version: version as Argon2Version,
            mCost,
            tCost,
            pCost,
        },
    };
}
