import { loadProject, Project } from "../project/mod.ts";

export interface GlobalOpts extends Record<string, unknown> {
	path?: string;
}

export async function initProject(opts: GlobalOpts): Promise<Project> {
	const project = await loadProject({ path: opts.path });
	return project;
}
