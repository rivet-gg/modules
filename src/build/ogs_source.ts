import { dirname, fromFileUrl, join } from "../deps.ts";
import { Project } from "../project/project.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

export async function getRuntimePath(_project: Project): Promise<string> {
    // TODO: https://github.com/rivet-gg/open-game-services-engine/issues/81
    return join(__dirname, "..", "runtime", "mod.ts");
}