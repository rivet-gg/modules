import { Project } from "../project/mod.ts";

const CONTAINER_NAME = "opengb-postgres";
const VOLUME_NAME = "opengb-postgres-data";

/**
 * Context about the Postgres server for the current process.
 */
const POSTGRES_STATE = {
	running: false,
};

export async function ensurePostgresRunning(_project: Project) {
	if (POSTGRES_STATE.running) return;

	// Validate Docker is installed
	const versionOutput = await new Deno.Command("docker", {
		args: ["version"],
		stdout: "piped",
		stderr: "piped",
	}).output();
	if (!versionOutput.success) {
		throw new Error(
			"Docker is not installed or running. Install here: https://docs.docker.com/get-docker/",
		);
	}

	// Check if volume already exists
	const volumeOutput = await new Deno.Command("docker", {
		args: ["volume", "ls", "-q", "-f", `name=${VOLUME_NAME}`],
		stdout: "piped",
	}).output();
	const volumeId = new TextDecoder().decode(volumeOutput.stdout).trim();
	if (!volumeId) {
		// Create the volume
		const volumeCreateOutput = await new Deno.Command("docker", {
			args: ["volume", "create", VOLUME_NAME],
		}).output();
		if (!volumeCreateOutput.success) {
			throw new Error("Failed to create the volume.");
		}
	}

	// Remove the existing container if exists. This forces the new
	// configuration for a new container.
	const rmOutput = await new Deno.Command("docker", {
		args: ["rm", "-f", CONTAINER_NAME],
	}).output();
	if (!rmOutput.success) {
		throw new Error("Failed to remove the existing container.");
	}

	// Start the container
	const runOutput = await new Deno.Command("docker", {
		args: [
			"run",
			"-d",
			"--name",
			CONTAINER_NAME,
			"-v",
			`${VOLUME_NAME}:/var/lib/postgresql/data`,
			"-p",
			"5432:5432",
			"-e",
			"POSTGRES_PASSWORD=postgres",
			"postgres:16",
		],
	}).output();
	if (!runOutput.success) {
		throw new Error("Failed to start the container:\n" + new TextDecoder().decode(runOutput.stderr));
	}

	// Wait until Postgres is accessible
	while (true) {
		const checkOutput = await new Deno.Command("docker", {
			args: ["exec", CONTAINER_NAME, "pg_isready"],
		}).output();
		if (checkOutput.success) break;
		await new Promise((r) => setTimeout(r, 500));
	}

	POSTGRES_STATE.running = true;
}
