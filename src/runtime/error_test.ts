import { assertExists, assertEquals } from "../deps.ts";
import { ModuleContext } from "./context.ts";
import { RuntimeError } from "./error.ts";
import { newTrace } from "./mod.ts";
import { Runtime } from "./runtime.ts";

Deno.test("error", async () => {
	// Setup
	const runtime = new Runtime({
		modules: {
			test_module: {
				scripts: {},
				errors: {
					"TEST_ERROR": {},
				},
				dependencies: new Set(["test_module"]),
			},
		},
	});
	const moduleContext = new ModuleContext(
		runtime,
		newTrace({ internalTest: {} }),
		"test_module",
		undefined,
	);

	// Create error
	const error = new RuntimeError("TEST_ERROR");
	assertEquals(error.message.split("\n")[0], "TEST_ERROR");

	// Erich error
	error.enrich(runtime, moduleContext);
	assertExists(error.moduleName);
	assertExists(error.trace);
	assertExists(error.errorConfig);
	assertEquals(error.message.split("\n")[0], "test_module[TEST_ERROR]");
});
