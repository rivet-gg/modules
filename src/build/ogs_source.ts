import { join } from "../deps.ts";
import { Project } from "../project/project.ts";

export async function getRuntimePath(_project: Project): Promise<string> {
    // TODO: Add ability 
    const dirname = import.meta.dirname;
    if (!dirname) throw new Error("Missing dirname");
    // TODO: https://github.com/rivet-gg/open-game-services-engine/issues/81
    return join(dirname, "..", "runtime", "mod.ts");
}