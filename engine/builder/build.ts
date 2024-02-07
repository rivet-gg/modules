import * as path from "$std/path/mod.ts";
import { exists, ensureDir } from "$std/fs/mod.ts";
import tjs from "tjs";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

let genPath = path.join(__dirname, "dist");
let schemaPath = path.join(genPath, "schema.ts");

await ensureDir(genPath);

console.log("Writing temporary schema");
await Deno.writeTextFile(schemaPath, "export let schema = {};");

console.log("Getting program files");
// TODO: Use glob
// TODO: Why is this not working
// const program = tjs.programFromConfig(path.join(__dirname, "tsconfig.json"), [
// 	path.resolve(__dirname, "src", "registry.ts"),
// ]);

const program = tjs.getProgramFromFiles([path.resolve(__dirname, "src", "registry.ts")], {
    target: "es2015",
    esModuleInterop: true,
}, __dirname);

console.log("Generating schema");
const schema = tjs.generateSchema(program, "ModuleConfig", {
    topRef: true,
	required: true,
	strictNullChecks: true,
	noExtraProps: true,
    esModuleInterop: true,
});
if (schema == null) throw new Error("Failed to generate schema");

console.log("Writing files");
await Deno.writeTextFile(
	schemaPath,
	`export let schema = ${JSON.stringify(schema, null, 4)};`
);

console.log("Finished");
