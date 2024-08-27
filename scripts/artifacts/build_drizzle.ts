// Generates a script to re-export all of the Drizzle types under a single package.
//
// This is used to make using the ORM much easier by being able to access `Query.*` instead of having to know the imports from two different packages.

import { DRIZZLE_ORM_PACKAGE } from "../../packages/toolchain/drizzle_consts.ts";
import { resolve } from "./deps.ts";
import { projectRoot } from "./util.ts";

/**
 * List all exports from a given package, excluding a given list.
 *
 * The exclude list is used to exclude type that don't have a corresponding value.
 */
async function getPackageExports(moduleName: any, excludedSymbols: string[]): Promise<string[]> {
	const module = await import(moduleName);
	const symbols = Object.keys(module).filter(
		(key) => !excludedSymbols.includes(key),
	);
	return symbols;
}

const exports = {
	drizzleOrm: await getPackageExports(DRIZZLE_ORM_PACKAGE, [
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
	drizzleOrmPgCore: await getPackageExports(`${DRIZZLE_ORM_PACKAGE}/pg-core`, [
		"InlineForeignKeys",
		"pgEnumWithSchema",
		"pgMaterializedViewWithSchema",
		"pgSequenceWithSchema",
		"pgTableWithSchema",
		"pgViewWithSchema",
	])
}

await Deno.writeTextFile(
	resolve(projectRoot(), "artifacts", "drizzle_orm.json"),
	JSON.stringify({ exports }),
);
