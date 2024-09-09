import { hash } from "./utils/common.ts";
import { ALGORITHM_DEFAULT } from "./utils/common.ts";

export function prehash(password: string): string {
    const algo = ALGORITHM_DEFAULT;
    return hash(password, algo);
}