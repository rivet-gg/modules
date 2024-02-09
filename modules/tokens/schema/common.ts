import { Trace } from '../../../engine/runtime/src/index.ts';

export interface Token {
    id: string,
    type: string,
    meta: Record<string, any>,
    trace: Trace,
    created_at: string,
    expire_at?: string,
    revoked_at?: string,
}
