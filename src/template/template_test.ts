import { DbDriver } from "../build/mod.ts";
import { build, Format, Runtime } from "../build/mod.ts";
import { loadProject } from "../project/mod.ts";
import { templateModule } from "./module.ts";
import { templateProject } from "./project.ts";
import { templateScript } from "./script.ts";

Deno.test("e2e", async () => {
	const path = await Deno.makeTempDir();

	await templateProject(path);

	await templateModule(await loadProject({ path }), "module_a");

	await templateScript(await loadProject({ path }), "module_a", "script_a");

	await build(await loadProject({ path }), {
		format: Format.Native,
		runtime: Runtime.Deno,
        dbDriver: DbDriver.NodePostgres,
	});
});
