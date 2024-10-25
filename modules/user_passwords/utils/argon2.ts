import { hash as hashArgon2, verify, Argon2Params } from "jsr:@blckbrry/xenon2@0.2.1/polyfill";
import { generateSalt } from "./common.ts";

// OWASP recommended defaults:
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
const argon2Params: Argon2Params = {
    algorithm: "Argon2id",
    version: 0x13,
    tCost: 2, // 2 iterations
    mCost: 19 * 1024, // 19MiB of memory
    pCost: 1, // 1 thread

};

export function createHash(password: string) {
    return hashArgon2(new TextEncoder().encode(password), generateSalt(), argon2Params);
}

export function hashMatches(guess: string, hash: string) {
    return verify(hash, new TextEncoder().encode(guess));
}
