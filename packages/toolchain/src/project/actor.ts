import { resolve } from "../deps.ts";
import { Module } from "./module.ts";
import { Project, genPath } from "./project.ts";
import { ActorConfig } from "../config/module.ts";

export interface Actor {
	path: string;
	name: string;
	storageAlias: string;
	config: ActorConfig;
}

export function actorGenPath(
	project: Project,
	module: Module,
	actor: Actor,
): string {
	return genPath(
    project,
		"modules",
    module.name,
		"actors",
		actor.name + ".ts",
	);
}
