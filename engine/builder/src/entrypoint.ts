import * as path from "https://deno.land/std/path/mod.ts";
import { tjs } from "./deps.ts";
import { Registry } from "../../registry/src/index.ts";

export async function generateEntrypoint(registry: Registry) {
    let outDir = path.join(registry.path, 'dist');
    let outPath = path.join(outDir, 'entrypoint.ts');

    // Generate module configs
    let modImports = "";
    let modConfig = "{";
    for (let mod of registry.modules.values()) {
        modConfig += `${JSON.stringify(mod.name)}: {`;

        // Generate script configs
        modConfig += "scripts: {";
        for (let script of mod.scripts.values()) {
            let handlerIdent = `modules__${mod.name}__${script.name}__handler`;

            modImports = `import { handler as ${handlerIdent} } from '../modules/${mod.name}/scripts/${script.name}.ts';\n`;
            modConfig += `${JSON.stringify(script.name)}: { handler: ${handlerIdent}, requestSchema: ${JSON.stringify(script.requestSchema)}, responseSchema: ${JSON.stringify(script.responseSchema)} },`;
        }
        modConfig += "},";

        modConfig += "}";
    }
    modConfig += "}";

    // Generate source
    let source = `
// This file is generated by @ogs/engine-builder

import { Runtime } from "../engine/runtime/src/index.ts";

${modImports}

async function main() {
    let runtime = new Runtime({
        modules: ${modConfig},
    });
    await runtime.serve();
}

main();

`;

    // Write file
    console.log('Writing entrypoint', outPath);
    await Deno.writeTextFile(outPath, source);
}

