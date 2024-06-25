import { isAbsolute, resolve } from "../deps.ts";
import { Runtime } from "../build/mod.ts";
import { esbuild } from "./deps.ts";
type Plugin = esbuild.Plugin;

/** Builds a single ESM file for a given Prisma package. */
export async function buildPrismaPackage(
	prismaModuleDir: string,
	outFile: string,
	runtime: Runtime,
) {
	// Build the ESM file
	await esbuild.build({
		entryPoints: [resolve(prismaModuleDir, "wasm.js")],
		bundle: true,
		outfile: outFile,
		plugins: [
			// Cloudflare does not support inlined WASM
			...(runtime == Runtime.CloudflareWorkersPlatforms ? [] : [wasmPlugin()]),
		],
		external: runtime == Runtime.CloudflareWorkersPlatforms ? ["*.wasm", "*.wasm?module"] : [],
		format: "esm",
		platform: "neutral",
	});

	// TODO: Use tsc to generate a single .d.ts file
	// Prepend TypeScript reference
	const content = await Deno.readTextFile(outFile);
	const newContent = `/// <reference types="./index.d.ts" />\n${content}`;
	await Deno.writeTextFile(outFile, newContent);
}

// Modified from https://esbuild.github.io/plugins/#http-plugin
function wasmPlugin(): Plugin {
	return {
		name: "wasm",
		setup(build) {
			// Resolve ".wasm" files to a path with a namespace
			build.onResolve({ filter: /\.wasm$/ }, (args) => {
				// If this is the import inside the stub module, import the
				// binary itself. Put the path in the "wasm-binary" namespace
				// to tell our binary load callback to load the binary file.
				if (args.namespace === "wasm-stub") {
					return {
						path: args.path,
						namespace: "wasm-binary",
					};
				}

				// Otherwise, generate the JavaScript stub module for this
				// ".wasm" file. Put it in the "wasm-stub" namespace to tell
				// our stub load callback to fill it with JavaScript.
				//
				// Resolve relative paths to absolute paths here since this
				// resolve callback is given "resolveDir", the directory to
				// resolve imports against.
				if (args.resolveDir === "") {
					return; // Ignore unresolvable paths
				}
				return {
					path: isAbsolute(args.path) ? args.path : resolve(args.resolveDir, args.path),
					namespace: "wasm-stub",
				};
			});

			// Virtual modules in the "wasm-stub" namespace are filled with
			// the JavaScript code for compiling the WebAssembly binary. The
			// binary itself is imported from a second virtual module.
			build.onLoad({ filter: /.*/, namespace: "wasm-stub" }, async (args) => ({
				contents: `
					import wasm from ${JSON.stringify(args.path)}
					const module = new WebAssembly.Module(wasm);
					export default module;
				`,
			}));

			// Virtual modules in the "wasm-binary" namespace contain the
			// actual bytes of the WebAssembly file. This uses esbuild's
			// built-in "binary" loader instead of manually embedding the
			// binary data inside JavaScript code ourselves.
			build.onLoad(
				{ filter: /.*/, namespace: "wasm-binary" },
				async (args) => ({
					contents: await Deno.readFile(args.path),
					loader: "binary",
				}),
			);
		},
	};
}
