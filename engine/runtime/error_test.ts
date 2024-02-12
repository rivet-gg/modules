import { ModuleContext } from "./context.ts";
import { RuntimeError } from "./error.ts";
import { newTrace } from "@ogs/runtime";
import { Runtime } from './runtime.ts';
import { assertExists } from "std/assert/assert_exists.ts";
import { assertEquals } from "std/assert/assert_equals.ts";

Deno.test("error", async () => {
    // Setup
    const runtime = new Runtime({
        modules: {
            test_module: {
                scripts: {},
                errors: {
                    "TEST_ERROR": {}
                },
            }
        }
    });
    const moduleContext = new ModuleContext(runtime, newTrace({ internalTest: {} }), "test_module");

    // Create error
    const error = new RuntimeError("TEST_ERROR");
    assertEquals(error.message.split('\n')[0], "TEST_ERROR");

    // Erich error
    error.enrich(runtime, moduleContext);
    assertExists(error.moduleName);
    assertExists(error.trace);
    assertExists(error.errorConfig); 
    assertEquals(error.message.split('\n')[0], "test_module[TEST_ERROR]");
});
