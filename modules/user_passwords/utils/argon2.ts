import {
    hash as hashArgon2,
    HashOptions,
    ThreadMode,
    Variant,
    verify as verifyArgon2,
    Version,
} from "https://deno.land/x/argon2_ffi@v1.0.5/mod.ts";
import { generateSalt } from "./common.ts";

// OWASP recommended defaults
const argon2Defaults: Partial<HashOptions> = {
    timeCost: 3, // 3 iterations
    memoryCost: 12 * 1024, // 12MiB of memory
    lanes: 1,
    threadMode: ThreadMode.Parallel,

    variant: Variant.Argon2id,
    version: Version.V13,
};

export function createHash(password: string) {
    return hashArgon2(password, {
        ...argon2Defaults,
        salt: generateSalt(),
    });
}

export function hashMatches(guess: string, hash: string) {
    return verifyArgon2(guess, hash);
}
