export type AggregationMethod = { count: {} } |
    { averageByKey: string } |
    { sumByKey: string };

export type Filter = { greaterThan: { key: string, value: number } } |
    { lessThan: { key: string, value: number } } |
    { equals: { key: string, value: number } } |
    { notEquals: { key: string, value: number } } |
    { greaterThanOrEquals: { key: string, value: number } } |
    { lessThanOrEquals: { key: string, value: number } };
