import dedent from "dedent";
import { genMarkdownDocsFromFile } from "./markdown_docs.ts";
import { OPENGB_ROOT, DOCS_ROOT } from "./paths.ts";
import { resolve } from "@std/path";

export async function generateModuleConfig() {
	const configSchema = await genMarkdownDocsFromFile(
		resolve(OPENGB_ROOT, "packages", "toolchain", "config", "module.ts"),
	);
	await Deno.writeTextFile(
		resolve(DOCS_ROOT, "docs", "build", "module-config.mdx"),
		dedent`---
    title: "Config (module.json)"
    icon: square-sliders
    ---

    # Schema

    ${configSchema}
    `,
	);
}
