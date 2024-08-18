import { dbSchemaHelperPath, DRIZZLE_ORM_REEXPORT, Module, Project, projectGenPath } from "../../project/mod.ts";
import { GeneratedCodeBuilder } from "./mod.ts";
import { InternalError } from "../../error/mod.ts";
import drizzleOrmArtifact from "../../../../../artifacts/drizzle_orm.json" with { type: "json" };
import { DRIZZLE_ORM_PACKAGE, DRIZZLE_ORM_PACKAGE_NPM } from "../../drizzle_consts.ts";

export interface DbSchemaHelperOpts {
	/** Used for generating temporary versions of the schema helper for Drizzle Kit. */
	overrideDbPath?: string;
	/** Used for generating temporary versions of the schema helper for Drizzle Kit. */
	overrideOrmReexportPath?: string;
	/** Used for when this is passed to Drizzle Kit since it can't resolve Deno dependencies. */
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

	const dbPath = opts.overrideDbPath ?? dbSchemaHelperPath(project, module);
	const ormReexportPath = opts.overrideOrmReexportPath ?? projectGenPath(project, DRIZZLE_ORM_REEXPORT);
	const ormPackage = opts.forceNodeModules ? DRIZZLE_ORM_PACKAGE_NPM : DRIZZLE_ORM_PACKAGE;

	await generateOrmReexport(ormReexportPath, ormPackage);
	await generateSchemaHelper(module, dbPath, ormPackage, ormReexportPath);
}

async function generateOrmReexport(path: string, ormPackage: string) {
	// Generate re-export script
	const helper = new GeneratedCodeBuilder(path, 3);

	helper.append`
    export { ${drizzleOrmArtifact.exports.drizzleOrm.join(", ")} } from ${JSON.stringify(ormPackage)};
    export { ${drizzleOrmArtifact.exports.drizzleOrmPgCore.join(", ")} } from ${
		JSON.stringify(`${ormPackage}/pg-core`)
	};
  `;

	await helper.write();
}

async function generateSchemaHelper(module: Module, path: string, ormPackage: string, ormReexportPath: string) {
	// TODO: This gets ran for every database, only needs to be ran once

	// Build schema helper
	const helper = new GeneratedCodeBuilder(path, 3);

	// Export the schema that the tables need to go in. The schema can vary based on the baceknd.json config.
	helper.append`
  import { pgSchema } from ${JSON.stringify(`${ormPackage}/pg-core`)};
  export const schema = pgSchema(${JSON.stringify(module.db?.schema)});
  `;

	// Re-export database types
	helper.append`
  export * as Query from ${JSON.stringify(helper.relative(ormReexportPath))};
  `;

	await helper.write();
}
