#!/usr/bin/env deno run -A

/*
 * TODO:
 * - generate module headers
 * - module subtext
 * - integrations as modules
 * - gray out coming soon
 * - add categories sidebar
 * - reformat cards with icon on left
 * - add platforms: discord, crazygames, poki, steam
 * - integrations
 * 	- outerbase
 * 	- idem
 * 	- infisical
 *  - openai
 * 	- rivet
 * - coming soon
 * 	- sentry
 * 	- posthog
 * 	- slack
 * 	- discord
 */

import { resolve } from "@std/path";
import { emptyDir } from "@std/fs";
import { assert } from "@std/assert";
import { ProjectMeta } from "../../../../packages/toolchain/build/meta.ts";
import { generateModuleCards } from "./module_cards.ts";
import { generateModulesOverview } from "./modules_overview.ts";
import { generateProjectConfig } from "./project_config.ts";
import { generateModuleConfig } from "./module_config.ts";
import { generateModule } from "./module.ts";
import { Category, processCategories } from "./categories.ts";
import { DOCS_MODULES_PATH, DOCS_ROOT, OPENGB_ROOT, TEST_PROJECT_PATH } from "./paths.ts";
import { generateMeta } from "./meta.ts";

if (Deno.env.has("BUILD_OPENGB")) {
	console.log("Build OpenGB CLI");
	const installOutput = await new Deno.Command("deno", {
		args: ["task", "artifacts:build"],
		cwd: OPENGB_ROOT,
		stdout: "inherit",
		stderr: "inherit",
	}).output();
	assert(installOutput.success);
}

if (!Deno.env.has("NO_BUILD_MODULES")) {
	console.log("Building project", TEST_PROJECT_PATH);
	const buildOutput = await new Deno.Command("deno", {
		args: [
			"run",
			"-A",
			resolve(OPENGB_ROOT, "packages", "cli", "main.ts"),
			"build",
		],
		cwd: TEST_PROJECT_PATH,
		stdout: "inherit",
		stderr: "inherit",
	}).output();
	assert(buildOutput.success);
}

console.log("Reading meta");
const metaRaw = await Deno.readTextFile(
	resolve(TEST_PROJECT_PATH, ".opengb", "meta.json"),
);
const meta = JSON.parse(metaRaw) as ProjectMeta;

// Clear generated modules
await emptyDir(DOCS_MODULES_PATH);

export interface TemplateContext {
	projectMeta: ProjectMeta;
	extraNav: any;
	categories: Category[];
}

const context: TemplateContext = {
	projectMeta: meta,
	extraNav: [],
	categories: processCategories(meta),
};

// Generate
await generateModuleCards(context);
await generateModulesOverview();
await generateProjectConfig();
await generateModuleConfig();
await generateMeta(context);

// Generate modules
for (const category of context.categories) {
	// Add nav
	const nav = {
		"group": category.name,
		"pages": [],
	};
	context.extraNav.push(nav);

	// Generate modules
	for (const module of category.modules) {
		await generateModule(context, nav, module.id, module.module);
	}
}

// Write navigation
const mintTemplate = JSON.parse(
	await Deno.readTextFile(
		resolve(DOCS_ROOT, "mint.template.json"),
	),
);
mintTemplate.navigation.push(...context.extraNav);
await Deno.writeTextFile(
	resolve(DOCS_ROOT, "mint.json"),
	JSON.stringify(mintTemplate, null, 2),
);
