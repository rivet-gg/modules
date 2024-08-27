export {
	ClassDeclaration,
	CodeBlockWriter,
	InterfaceDeclaration,
	Node,
	Project,
	Symbol,
	ts,
	Type,
	TypeAliasDeclaration,
	TypeNode,
	VariableDeclarationKind,
} from "https://deno.land/x/ts_morph@22.0.0/mod.ts";

// both of those libraries needs to be from the same registry, otherwise it will not work
import { extendZodWithOpenApi } from "npm:@asteasolutions/zod-to-openapi@7.1.1";
export { OpenApiGeneratorV31, OpenAPIRegistry } from "npm:@asteasolutions/zod-to-openapi@7.1.1";
export { ZodError } from "npm:zod@3.23.8";
import { z } from "npm:zod@3.23.8";

extendZodWithOpenApi(z);
export { z };
