import { hash as hashBCrypt, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export function createHash(password: string) {
    return hashBCrypt(password);
}

export function hashMatches(guess: string, hash: string) {
    return compare(guess, hash);
}
