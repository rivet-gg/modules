import { resolve } from "@std/path";

export const DOCS_ROOT = resolve(import.meta.dirname!, "..", "..", "..");
export const DOCS_MODULES_PATH = resolve(DOCS_ROOT, "modules");

export const OPENGB_ROOT = resolve(
	DOCS_ROOT,
	"..",
);

export const TEMPLATES_ROOT = resolve(import.meta.dirname!, "..", "..", "templates");

export const TEST_PROJECT_PATH = resolve(
	DOCS_ROOT,
	"..",
	"..",
	"opengb-modules",
	"tests",
	"basic",
);
