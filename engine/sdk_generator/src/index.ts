import * as path from "https://deno.land/std/path/mod.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

interface Generator {
    generator: string;
}

const GENERATORS: Record<string, Generator> = {
    typescript: {
        generator: "typescript-fetch"
    }
};

async function main() {
    let rootPath = path.join(__dirname, '..', '..', '..');
    for (let name in GENERATORS) {
        let generator = GENERATORS[name];
        await generateSdk(rootPath, name, generator);
    }
}

async function generateSdk(rootPath: string, name: string, config: Generator) {
    console.log('Generating', name);
    let status = await Deno.run({
        cmd: [
            "docker", "run", "--rm", "-v", `${rootPath}:/local`,
            "openapitools/openapi-generator-cli:v7.2.0", "generate",
            "-i", "/local/dist/openapi.json",
            "-g", config.generator,
            "-o", `/local/dist/sdks/${name}/`
        ],
    }).status();
    if (!status.success) {
        throw new Error('Failed to generate OpenAPI SDK');
    }

}

main();

