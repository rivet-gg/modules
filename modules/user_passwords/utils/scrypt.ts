import { hash as hashScrypt, verify } from "https://deno.land/x/scrypt@v4.4.4/mod.ts";
import { ScryptParameters } from "https://deno.land/x/scrypt@v4.4.4/lib/format.ts";

// OWASP recommended defaults (listed option 3):
// https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
const scryptParams: Partial<ScryptParameters> = {
    logN: 15,
    r: 8,
    p: 3,
};

export function createHash(password: string) {
    return hashScrypt(password, scryptParams);
}

export function hashMatches(guess: string, hash: string) {
    return verify(guess, hash);
}
