#!/usr/bin/env -S deno run -A

// import * as esbuild from "https://deno.land/x/esbuild@v0.20.2/mod.js";
// import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.10.3";
// import { generate } from "https://deno.land/x/dts_generate@v1.4.0/mod.ts";
// import { build } from 'https://esm.sh/tsup'
import "npm:typescript";
import { build } from "npm:tsup";
import { resolve } from "https://deno.land/std@0.208.0/path/resolve.ts";

const entryPath = resolve(Deno.cwd(), "./sdk/src/index.ts");
const outDir = resolve(Deno.cwd(), "./client/dist/");

const genOutput = await new Deno.Command(
	"opengb",
	{
		args: ["sdk", "generate", "typescript"],
		stdout: "inherit",
		stderr: "inherit",
	},
).output();
if (!genOutput.success) throw new Error("gen failed");

Deno.chdir(resolve(Deno.cwd(), "sdk"));

await new Deno.Command("npm", { args: ["install"], stdout: "inherit", stderr: "inherit" }).output();

await new Deno.Command("npm", { args: ["run", "build"], stdout: "inherit", stderr: "inherit" }).output();

await build({
	entry: { sdk: entryPath },
	outDir,
	sourcemap: true,
	dts: true,
	target: "es2022",
	format: "esm",
});

// TODO: Do we need to polyfill anything to target es6?
// const result = await esbuild.build({
//   entryPoints: ['./sdk/src/index.ts'],
//   outfile,
//   platform: "browser",
//   format: "esm",
//   target: 'es2022',
//   sourcemap: true,
//   plugins: denoPlugins(),
//   bundle: true,
// });
//
// console.log('Build complete:', result);
//
// // Generate .d.ts file
// // const dtsResult = await generate({
// //   entries: ['./src/main.ts'],
// //   output: outfile.replace('.js', '.d.ts'),
// // });
//
// const output = await new Deno.Command(
// 	"tsc",
// 	{
//     args: ["--project", "sdk/tsconfig.json", "--outFile", dtsOutFile],
// 		// args: ["--emitDeclarationOnly", "--declaration", "--declarationMap", "--project", "sdk/tsconfig.json", "--outFile", dtsOutFile],
//     stdout: "inherit",
//     stderr: "inherit",
// 	}
// ).output();
// if (!output.success) throw new Error("tsc failed");
//
// console.log('Declaration file generated');
//
// esbuild.stop();