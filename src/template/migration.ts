import * as path from "std/path/mod.ts";
import { loadProject } from "../project/mod.ts";

const moduleName = Deno.args[0];
const migrationName = Deno.args[1];
if (!moduleName) throw new Error("Module name required");
if (!migrationName) throw new Error("Migration name required");

const project = await loadProject();

const mod = project.modules.get(moduleName);
if (!mod) {
	throw new Error(`Missing module ${moduleName}`);
}

const migrationsPath = path.join(
	project.path,
	"modules",
	moduleName,
	"db",
	"migrations",
);

// Get the migration name
const migrations = await Deno.readDir(migrationsPath);
let highestMigrationNumber = 0;
for await (const entry of migrations) {
	if (entry.isFile && entry.name.endsWith(".sql")) {
		const migrationNumber = parseInt(entry.name.split("_")[0]);
		if (migrationNumber > highestMigrationNumber) {
			highestMigrationNumber = migrationNumber;
		}
	}
}

// Create migratoin name
const migrationNumber = (highestMigrationNumber + 1).toString().padStart(
	4,
	"0",
);
const migrationNameFull = migrationNumber + "_" + migrationName;

// Write default config
const migrationPath = path.join(
	project.path,
	"modules",
	moduleName,
	"db",
	"migrations",
	migrationNameFull + ".sql",
);
const migrationSql = `-- TODO: Write migration

`;
await Deno.writeTextFile(migrationPath, migrationSql);
