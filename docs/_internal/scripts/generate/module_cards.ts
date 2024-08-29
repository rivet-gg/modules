import dedent from "dedent";
import { resolve } from "@std/path";
import { DOCS_ROOT } from "./paths.ts";
import { TemplateContext } from "./main.ts";
import { Category } from "./categories.ts";

export async function generateModuleCards(context: TemplateContext) {
	const source = dedent`
	import { H2 } from "/snippets/intro.mdx";

	export const ModuleCards = ({ cols }) => (
		<>
		  ${generateCategories(context).join("\n\n")}
		</>
	);
	`;
	await Deno.writeTextFile(
		resolve(DOCS_ROOT, "snippets", "module-cards.mdx"),
		source,
	);
}

function generateCategories(context: TemplateContext): string[] {
	return context.categories.map((c) => {
		return dedent`
		<H2 id="${c.slug}">${c.name}</H2>
		<p>${c.description}</p>
		<div style={{ height: '20px' }}/>
		<CardGroup cols={cols ?? 2}>
			${generateModules(c).join("\n")}
		</CardGroup>
		`;
	});
}

function generateModules(category: Category): string[] {
	return category.modules.map(({ id, module }) => {
		return dedent`
		<Card 
		title="${module.config.name}" 
		icon="${module.config.icon}" 
		href="/modules/${id}/overview"
		>
			${module.config.status == "coming_soon" ? "[Early Access] " : ""}${module.config.description!.split(".")[0]}
		</Card>
		`;
	});
}
