import { TemplateContext } from "./main.ts";
import { OPENGB_ROOT, DOCS_ROOT } from "./paths.ts";
import { genMarkdownDocsFromFile } from "./markdown_docs.ts";
import { resolve } from "@std/path";
import { readTemplate } from "./templates.ts";

export async function generateProjectConfig() {
	const configSchema = await genMarkdownDocsFromFile(
		resolve(OPENGB_ROOT, "packages", "toolchain", "config", "project.ts"),
	);
	await Deno.writeTextFile(
		resolve(DOCS_ROOT, "docs", "project-config.mdx"),
		(await readTemplate("project_config")).replace(/%%SCHEMA%%/g, configSchema)
	);
}
