import { resolve } from "@std/path/resolve";
import { TemplateContext } from "./main.ts";
import { DOCS_ROOT } from "./paths.ts";

export async function generateMeta(context: TemplateContext) {
    const categories = context.categories.map((category) => {
        const modules = category.modules.map(({ id, module }) => {
            return {
                id,
                name: module.config.name,
                description: module.config.description,
                status: module.config.status,
                icon: module.config.icon,
            };
        });

        return {
            name: category.name,
            description: category.description,
            modules,
        };
    });
    await Deno.writeTextFile(
        resolve(DOCS_ROOT, "_internal", "meta.json"),
        JSON.stringify({ categories }, null, 2),
    );
}
