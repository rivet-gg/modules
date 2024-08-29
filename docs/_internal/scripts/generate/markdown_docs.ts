import { zod2md } from "npm:zod2md";
import { convertSerializedSchemaToZodConstant } from "../../../../packages/toolchain/build/schema/deserializer.ts";

export async function genMarkdownDocsFromFile(entry: string) {
	let markdown = await zod2md({
		entry,
		title: "",
	});
	markdown = markdown.replace(/^#\s.*$/gm, "").replace(/^(#+)\s/gm, "#$1 ");
	return markdown;
}

export async function genMarkdownDocsFromSchema(schema: any, name: string) {
	let schemaTs = `import { z } from "npm:zod@3.23.8";\n`;
	schemaTs += convertSerializedSchemaToZodConstant(schema, { name, export: true });

	const tempFilePath = await Deno.makeTempFile({ suffix: ".ts" });
	await Deno.writeTextFile(tempFilePath, schemaTs);

	return await genMarkdownDocsFromFile(tempFilePath);
}

