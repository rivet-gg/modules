import { Filter } from "./types.ts";

export const stringifyFilters = (filters: Filter[]) => filters.map((filter: Filter) => {
    if ("greaterThan" in filter) return "(metadata->>'" + filter.greaterThan.key + "')::int" + " > " + filter.greaterThan.value;
    if ("lessThan" in filter) return "(metadata->>'" + filter.lessThan.key + "')::int" + " < " + filter.lessThan.value;
    if ("equals" in filter) return "(metadata->>'" + filter.equals.key + "')::int" + " = " + filter.equals.value;
    if ("notEquals" in filter) return "(metadata->>'" + filter.notEquals.key + "')::int" + " != " + filter.notEquals.value;
    if ("greaterThanOrEquals" in filter) return "(metadata->>'" + filter.greaterThanOrEquals.key + "')::int" + " >= " + filter.greaterThanOrEquals.value;
    if ("lessThanOrEquals" in filter) return "(metadata->>'" + filter.lessThanOrEquals.key + "')::int" + " <= " + filter.lessThanOrEquals.value;

    throw new Error("Unknown filter type");
}).join(' AND ');