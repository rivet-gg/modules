import { hash as hashBCrypt, verify, BcryptParams } from "jsr:@blckbrry/bcrypt@0.17.1/polyfill";

// OWASP recommended defaults:
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#bcrypt
const bcryptParams: BcryptParams = {
    cost: 10,
    version: "2b", // 2b is the newest version of the OpenBSD bcrypt standard.
};

export function createHash(password: string) {
    return hashBCrypt(new TextEncoder().encode(password), undefined, bcryptParams);
}

export function hashMatches(guess: string, hash: string) {
    return verify(new TextEncoder().encode(guess), hash);
}
