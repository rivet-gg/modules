import { loadProject, Project } from "../../toolchain/src/project/mod.ts";

export interface GlobalOpts extends Record<string, unknown> {
	/** Path to the project root or project config. */
	project?: string;
}

export async function initProject(opts: GlobalOpts): Promise<Project> {
	const project = await loadProject({ project: opts.project });
	return project;
}
