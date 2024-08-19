import { ScriptContext } from "../module.gen.ts";
import { checkHypertable } from "../utils/hypertable_init.ts";
import { stringifyFilters } from "../utils/stringify_filters.ts";
import { AggregationMethod, Filter } from "../utils/types.ts";

export interface Request {
    event: string;
    aggregate: AggregationMethod;
    filters: Filter[]
    groupBy: string[];
    startAt: number;
    stopAt: number;
}

export interface Response {
    results: { groups: Record<string, any>, count: number}[]
}

export async function run(
    ctx: ScriptContext,
    req: Request,
): Promise<Response> {
	checkHypertable(ctx);

    const props = req.groupBy.map((col) => `metadata->>'${col}'`);

    // A query that counts the amount of events in the database, per name (should return an array of counts per name)
    // the name isn't an actual field but instead a value in the metadata field
    const result = await ctx.db.$queryRawUnsafe(`
        SELECT ${req.groupBy.map(col => `metadata->>'${col}' as _${col}`).join(', ')}, COUNT(*) as count
        FROM "${ctx.dbSchema}"."Event"
        WHERE name = '${req.event}'
            AND timestamp >= '${new Date(req.startAt).toISOString()}'
            AND timestamp <= '${new Date(req.stopAt).toISOString()}'
            ${req.filters.length ? " AND " + stringifyFilters(req.filters) : ""}
        GROUP BY ${props.join(', ')}
        ORDER BY ${props.join(', ')}
    `) as any;

    return { 
        results: result.map((e: any) => ({
            // TODO: optimize
            groups: props.reduce<Record<string, any>>((acc, k) => (acc[k] = e["_" + k], acc), {}),
            count: e.count
    }))
    }
}

