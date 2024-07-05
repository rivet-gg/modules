import { hash as hashSCrypt, verify } from "https://deno.land/x/scrypt@v4.4.4/mod.ts";
import { ScryptParameters } from "https://deno.land/x/scrypt@v4.4.4/lib/format.ts";

const scryptParams: Partial<ScryptParameters> = {
    logN: 15,
    r: 8,
    p: 1,
};

export function createHash(password: string) {
    return hashSCrypt(password, scryptParams);
}

export function hashMatches(guess: string, hash: string) {
    return verify(guess, hash);
}
