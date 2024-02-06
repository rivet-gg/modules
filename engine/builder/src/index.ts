import { Registry } from "./registry";
import path from "path";
import { compileProtobuf } from './schema';

async function main() {
    // Load registry
    let rootPath = path.join(__dirname, "..", "..", "..");
    let registry = await Registry.load(rootPath);

    // Compile schema
    compileProtobuf(registry);

    // TODO: Generate entrypoint

    console.log('Loaded registry');

}

main();

