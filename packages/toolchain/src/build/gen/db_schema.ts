import { dbSchemaHelperPath, DRIZZLE_ORM_REEXPORT, Module, Project, projectGenPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import { InternalError } from "../../error/mod.ts";
import { DRIZZLE_ORM_PACKAGE, DRIZZLE_ORM_PACKAGE_NPM } from "../../drizzle.ts";
import drizzleOrmReexport from "../../../../../artifacts/drizzle_orm_reexport.json" with { type: "json" };

export interface DbSchemaHelperOpts {
	overridePath?: string;
	forceNodeModules?: boolean;
}

export async function compileDbSchemaHelper(
	project: Project,
	module: Module,
	opts: DbSchemaHelperOpts,
) {
	if (!module.db) {
		throw new InternalError("Cannot generate db schema for module without db");
	}

	// TODO: This gets ran for every database, only needs to be ran once
	// Generate re-export script
	const drizzleormReexportpath = projectGenPath(project, DRIZZLE_ORM_REEXPORT);
	await Deno.writeTextFile(drizzleormReexportpath, drizzleOrmReexport);

	// Build schema helper
	const helper = new GeneratedCodeBuilder(opts.overridePath ?? dbSchemaHelperPath(project, module), 3);

	// TODO: Pin version here but it doesn't work with drizzle gen
	// Export the schema that the tables need to go in. The schema can vary based on the baceknd.json config.
	helper.append`
  import { pgSchema } from ${
		JSON.stringify(`${opts.forceNodeModules ? DRIZZLE_ORM_PACKAGE_NPM : DRIZZLE_ORM_PACKAGE}/pg-core`)
	};
  export const schema = pgSchema(${JSON.stringify(module.db?.schema)});
  `;

	// Re-export database types
	helper.append`
  export * as Query from ${JSON.stringify(helper.relative(drizzleormReexportpath))};
  `;

	await helper.write();
}
