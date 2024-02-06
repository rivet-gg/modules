import { glob } from 'glob';
import path from 'path';

export class Registry {
    public static load(rootPath: string) {
        let modules = await glob("modules/*/module.yaml", { cwd: rootPath });
        for (let mod of modules) {
            Module.load(path.)

        }
    }
}

export class Module {

}

export class Function {

}
