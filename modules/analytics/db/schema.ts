import { Query, schema, uniqueIndex, index } from "./schema.gen.ts";

export const events = schema.table("events", {
    id: Query.uuid("id").primaryKey().defaultRandom(),
    timestamp: Query.timestamp("timestamp"),
    name: Query.text("name"),
    metadata: Query.jsonb("metadata")
}, (table) => ({
    eventId: uniqueIndex("event_id").on(table.id),
    eventNameTime: index("event_name_time").on(table.name, Query.desc(table.timestamp))
}));
