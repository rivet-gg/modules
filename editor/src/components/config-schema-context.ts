import { createContext } from "react";
import type { ZodObject } from "zod";

// FIXME: use zod schemas from opengb
// biome-ignore lint/suspicious/noExplicitAny: we do not care about the shape of the schema
export const ConfigSchemaContext = createContext<ZodObject<any> | undefined>(
  undefined,
);
