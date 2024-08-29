import dedent from "dedent";
import { resolve } from "@std/path";
import { DOCS_ROOT } from "./paths.ts";

export async function generateModulesOverview() {
	// Generate an overview page for modules. This is not included in the nav,
	// but exists in case someone routes to `/modules` and gets redirected
	// here.
	await Deno.writeTextFile(
		resolve(DOCS_ROOT, "modules", "overview.mdx"),
    dedent`
    ---
    title: All Modules
    mode: "wide"
    ---

    import { ModuleCards } from "/snippets/module-cards.mdx";
    import { Tags } from "/snippets/tags.mdx";

    <ModuleCards />
    `
	);
}
