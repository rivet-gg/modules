import { ScriptContext } from "../module.gen.ts";

let hasDefinitelyRun = false;
export const createHypertable = async (ctx: ScriptContext) => {
    if (hasDefinitelyRun) return;

    await ctx.db.$queryRaw`SELECT create_hypertable('event', 'timestamp');`;

    hasDefinitelyRun = true;
}