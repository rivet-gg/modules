import { z, ZodType } from "zod";
import { AnySchemaElement, is } from "../../../packages/toolchain/build/schema/schema";

export function convertSchemaToZod(schema: AnySchemaElement): ZodType {
    if (is("unknown", schema)) {
        return z.unknown();
    }
    if (is("optional", schema)) {
        return z.optional(convertSchemaToZod(schema.value));
    }
    if (is("date", schema)) {
        return z.coerce.date();
    }
    if (is("string", schema)) {
        return z.string();
    }
    if (is("number", schema)) {
        return z.number();
    }
    if (is("boolean", schema)) {
        return z.boolean();
    }
    if (is("undefined", schema)) {
        return z.undefined();
    }
    if (is("null", schema)) {
        return z.null();
    }
    if (is("any", schema)) {
        return z.any();
    }
    if (is("literal", schema)) {
        return z.literal(schema.value);
    }
    if (is("tuple", schema)) {
        const [item, ...items] = schema.items.map(convertSchemaToZod);
        return z.tuple([item, ...items]);
    }
    if (is("array", schema)) {
        return z.array(convertSchemaToZod(schema.item!));
    }
    if (is("intersection", schema)) {
        return z.intersection(
            convertSchemaToZod(schema.left),
            convertSchemaToZod(schema.right),
        );
    }
    if (is("union", schema)) {
        const [itemA, itemB, ...items] = schema.items.map(convertSchemaToZod);
        return z.union([itemA, itemB, ...items]);
    }
    if (is("nullable", schema)) {
        return z.nullable(convertSchemaToZod(schema.item!));
    }
    if (is("object", schema)) {
        return z.object(
            Object.fromEntries(
                Object.entries(schema.properties).map((
                    [key, value],
                ) => [key, convertSchemaToZod(value)]),
            ),
        ).strict();
    }
    if (is("record", schema)) {
        return z.record(convertSchemaToZod(schema.elementType));
    }
    if (is("never", schema)) {
        return z.never();
    }

    return z.never();
}
