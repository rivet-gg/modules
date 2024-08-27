import { ensureFile } from "../deps.ts";

export interface State {
	port?: number;
	superuserPassword?: string;
}

export async function readState(statePath: string): Promise<State> {
	try {
		const stateJson = await Deno.readTextFile(statePath);
		return JSON.parse(stateJson) as State;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			return {};
		}
		throw error;
	}
}

export async function writeState(statePath: string, state: State): Promise<void> {
	await ensureFile(statePath);
	const stateJson = JSON.stringify(state, null, 2);
	await Deno.writeTextFile(statePath, stateJson);
}
