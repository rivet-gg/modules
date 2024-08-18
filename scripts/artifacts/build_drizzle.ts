// Generates a script to re-export all of the Drizzle types under a single package.
//
// This is used to make using the ORM much easier by being able to access `Database.*` instead of having to know the imports from two different packages.

import { DRIZZLE_ORM_PACKAGE } from "../../packages/toolchain/src/drizzle.ts";
import { resolve } from "./deps.ts";
import { projectRoot } from "./util.ts";

/**
 * List all exports from a given package, excluding a given list.
 *
 * The exclude list is used to exclude type that don't have a corresponding value.
 */
async function getPackageExports(moduleName: any, excludedSymbols: string[]): string[] {
	const module = await import(moduleName);
	const symbols = Object.keys(module).filter(
		(key) => !excludedSymbols.includes(key),
	);
	return symbols;
}

const exports = {
	drizzleOrm: getPackageExports(DRIZZLE_ORM_PACKAGE, [
		"BaseName",
		"Columns",
		"ExtraConfigBuilder",
		"ExtraConfigColumns",
		"IsAlias",
		"OriginalName",
		"Schema",
		"TableName",
		"applyMixins",
		"getTableLikeName",
		"mapResultRow",
		"mapUpdateSet",
		"orderSelectedFields",
	]),
	[`${DRIZZLE_ORM_PACKAGE}/pg-core`]: getPackageExports(`${DRIZZLE_ORM_PACKAGE}/pg-core`, [
		"InlineForeignKeys",
		"pgEnumWithSchema",
		"pgMaterializedViewWithSchema",
		"pgSequenceWithSchema",
		"pgTableWithSchema",
		"pgViewWithSchema",
	])
}

await Deno.writeTextFile(
	resolve(projectRoot(), "artifacts", "drizzle_orm_exports.json"),
	JSON.stringify(exports),
);
