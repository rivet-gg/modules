import {
	createDatabase,
	createManager,
	databaseExists,
	dropDatabase,
	Manager,
	setup,
	Status,
	status,
	stop,
} from "./manager.ts";
import { Settings } from "./settings.ts";
import { assertEquals, assertRejects, exists, resolve } from "../deps.ts";

async function createTempSettings(): Promise<Settings> {
	const tempDir = await Deno.makeTempDir();
	return {
		stateFile: resolve(tempDir, "manager_state.json"),
		version: "16.4.0",
		installationDir: resolve(tempDir, "installation"),
		passwordFile: resolve(tempDir, ".pgpass"),
		dataDir: resolve(tempDir, "data"),
		host: "localhost",
		configuration: {},
		defaultDatabases: ["foo", "bar"],
	};
}

Deno.test("e2e", async () => {
	const settings = await createTempSettings();
	const manager: Manager = await createManager(settings);

	await setup(manager);

	assertEquals(await exists(settings.installationDir, { isDirectory: true }), true);
	assertEquals(await exists(settings.dataDir, { isDirectory: true }), true);

	assertEquals(await status(manager), Status.Started);

	assertEquals(await databaseExists(manager, "foo"), true);
	assertEquals(await databaseExists(manager, "bar"), true);

	const dbName = "test_db";

	await createDatabase(manager, dbName);
	assertEquals(await databaseExists(manager, dbName), true);

	await assertRejects(
		async () => {
			await createDatabase(manager, dbName);
		},
		"Database should already exist",
	);

	await dropDatabase(manager, dbName);
	assertEquals(await databaseExists(manager, dbName), false);

	await stop(manager);
	assertEquals(await status(manager), Status.Stopped);

	await setup(manager);
	assertEquals(await status(manager), Status.Started);

	await stop(manager);
	assertEquals(await status(manager), Status.Stopped);
});
