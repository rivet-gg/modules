import { Project } from "../project/project.ts";
import { verbose } from "../term/status.ts";
import { createOnce, getOrInitOnce } from "../utils/once.ts";
import { Manager, setup } from "./manager.ts";
import { createManager } from "./manager.ts";
import { defaultSettings } from "./settings.ts";

/**
 * Holds the manager that was created.
 */
const DEFAULT_MANAGER = createOnce<Manager>();

/**
 * Indicates if Postgres has already been setup once.
 */
const ENSURE_RUNNING_ONCE = createOnce<void>();

/**
 * Create Postgres manager if needed.
 *
 * This will not setup Postgres. See `ensurePostgresRunning` for that.
 */
export async function getDefaultPostgresManager(project: Project): Promise<Manager | void> {
	if (
		Deno.env.has("DATABASE_URL") || Deno.env.has("OPENGB_DONT_START_POSTGRES")
	) {
		verbose("Postgres disabled");
		return;
	}

	return await getOrInitOnce(DEFAULT_MANAGER, async () => {
		const settings = await defaultSettings(project);
		return createManager(settings);
	});
}

/**
 * Create & setup Postgres manager if needed.
 */
export async function ensurePostgresRunning(project: Project) {
	return await getOrInitOnce(ENSURE_RUNNING_ONCE, async () => {
		const manager = await getDefaultPostgresManager(project);
		if (manager) {
			await setup(manager);
		}
	});
}
