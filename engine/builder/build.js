const path = require("path");
const tjs = require("typescript-json-schema");
const fs = require("fs");

let genPath = path.join(__dirname, "dist");
let schemaPath = path.join(genPath, "schema.ts");

console.log("Writing temporary schema");
fs.writeFileSync(schemaPath, "export let schema = {};");

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

console.log("Writing files");
if (!fs.existsSync(genPath)) fs.mkdirSync(genPath);
fs.writeFileSync(
	schemaPath,
	`export let schema = ${JSON.stringify(schema, null, 4)};`
);

console.log("Finished");
