import * as V1 from "./v1.ts";

export * from "./v1.ts";

export type StateVersioned = { version: 1, state: V1.State }

export function migrateState(versioned: StateVersioned): V1.State {
	// Nothing to migrate yet
	return versioned.state;
}

