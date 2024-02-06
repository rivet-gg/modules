import { Registry } from "./registry";
import path from "path";
import { compileProtobuf } from './schema';

async function main() {
    // Load registry
    let rootPath = path.join(__dirname, "..", "..", "..");
    let registry = await Registry.load(rootPath);

    // Compile schema
    compileProtobuf(registry);

    // TODO: Compile Protobuf

    // TODO: Compile JavaScript

    console.log('Loaded registry');

}

main();

