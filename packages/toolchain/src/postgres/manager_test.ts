import {
	createDatabase,
	createManager,
	databaseExists,
	dropDatabase,
	isRunning,
	Manager,
	setup,
	start,
	stop,
} from "./manager.ts";
import { Settings } from "./settings.ts";
import { assertEquals, assertRejects, exists, resolve } from "../deps.ts";

async function createTempSettings(): Promise<Settings> {
	const tempDir = await Deno.makeTempDir();
	return {
		releasesUrl: "",
		version: "16.4.0",
		installationDir: resolve(tempDir, "installation"),
		passwordFile: resolve(tempDir, ".pgpass"),
		dataDir: resolve(tempDir, "data"),
		host: "localhost",
		port: 0,
		username: "postgres",
		password: "test-password",
		temporary: true,
		timeout: 5000,
		configuration: {},
	};
}

Deno.test("e2e", async () => {
	const settings = await createTempSettings();
	const manager: Manager = createManager(settings);

	await setup(manager);
	assertEquals(await exists(settings.installationDir, { isDirectory: true }), true);
	assertEquals(await exists(settings.dataDir, { isDirectory: true }), true);

	await start(manager);
	assertEquals(await isRunning(manager), true);

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
	assertEquals(await isRunning(manager), false);
});
