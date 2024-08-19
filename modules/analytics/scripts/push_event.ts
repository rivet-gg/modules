import { ScriptContext } from "../module.gen.ts";
import { checkHypertable } from "../utils/hypertable_init.ts";

export interface Request {
    name: string,
    metadata: any,
    timestampOverride?: string,
}

export interface Response {
    id: string,
    timestamp: number,
}

export async function run(
    ctx: ScriptContext,
    req: Request,
): Promise<Response> {
    checkHypertable(ctx);
    const timestamp = req.timestampOverride ? new Date(req.timestampOverride) : new Date();
    const event = await ctx.db.event.create({
        data: {
            name: req.name,
            timestamp,
            metadata: req.metadata
        }
    });

    return { id: event.id, timestamp: timestamp.getTime() };
}

