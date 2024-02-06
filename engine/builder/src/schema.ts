import { Registry } from './registry';
import path from 'path';
import { glob } from 'glob';
import { pbjs, pbts } from "protobufjs-cli";

export async function compileProtobuf(registry: Registry) {
    let protoFiles = await glob(["modules/*/schema/*.proto", "modules/*/functions/*/schema.proto"], { cwd: registry.path });
    protoFiles = protoFiles.map(p => path.join(registry.path, p));
    console.log('Proto files:', protoFiles);
    if (protoFiles.length == 0) {
        throw new Error("No proto files found");
    }

    let jsOutput = path.join(__dirname, '..', '..', '..', 'dist', 'schema.js');
    let tsOutput = path.join(__dirname, '..', '..', '..', 'dist', 'schema.d.ts');

    // Generate JS defintions
    await new Promise((resolve, reject) => {
        pbjs.main(["-t", "static-module", "-w", "commonjs", "-o", jsOutput, ...protoFiles], function(err) {
            if (err) return reject(err);
            console.log("Static JS generated successfully.");
            resolve(undefined);
        });

    });

    // Generate TS definitions from static JS
    await new Promise((resolve, reject) => {
        pbts.main(["-o", tsOutput, jsOutput], function(err) {
            if (err) return reject(err);
            console.log("TS definitions generated successfully.");
            resolve(undefined);
        });
    });
}

