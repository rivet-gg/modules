export type PathPair = { path: string; isPrefix: boolean };

export interface QualifiedPathPair {
	module: string;
	route: string;
	path: PathPair;
}

/**
 * A class to resolve paths to their associated {@link QualifiedPathPair}.
 *
 * This is used to look up `QualifiedPathPair` values by the requested path.
 */
export class PathResolver {
	private readonly exactRoutes: Map<string, QualifiedPathPair> = new Map();
	private readonly prefixRoutes: Map<string, QualifiedPathPair> = new Map();

	private _collisions: Set<QualifiedPathPair> | undefined = undefined;

	public constructor(routes: QualifiedPathPair[]) {
		for (const route of routes) {
			const { isPrefix, path } = route.path;
			if (isPrefix) {
				this.prefixRoutes.set(path, route);
			} else {
				this.exactRoutes.set(path, route);
			}
		}
	}

	/**
	 * A utility function to ensure that there are no collisions between paths.
	 *
	 * This function is used in the constructor to ensure that no path is a child
	 * of a prefix and no prefix is the ancestor of any path.
	 *
	 * @param paths The paths to check for collisions
	 *
	 * @throws `Error` if any paths are found to collide
	 */
	private static getCollisions(routes: QualifiedPathPair[]) {
		const bannedPrefixes = new Map<string, QualifiedPathPair>();

		const takenPrefixes = new Map<string, QualifiedPathPair>();
		const takenExact = new Map<string, QualifiedPathPair>();

		const issuePaths = new Set<QualifiedPathPair>();

		for (const routeInfo of routes) {
			const path = routeInfo.path;

			// Make sure it is not exactly the same as any other exact path
			const takingRoute = takenExact.get(path.path);
			if (takingRoute) {
				issuePaths.add(takingRoute);
				issuePaths.add(routeInfo);
			}

			// Make sure it is not a child of any prefixed path
			for (const ancestor of pathAncestors(path.path)) {
				const conflictingPrefix = takenPrefixes.get(ancestor);
				if (conflictingPrefix) {
					issuePaths.add(conflictingPrefix);
					issuePaths.add(routeInfo);
				}
			}

			// If the path is a prefix:
			if (path.isPrefix) {
				// Make sure it is not an ancestor of any other registered path
				// (prefix or exact)
				const conflictingChild = bannedPrefixes.get(path.path);
				if (conflictingChild) {
					issuePaths.add(conflictingChild);
					issuePaths.add(routeInfo);
				}

				takenPrefixes.set(path.path, routeInfo);
			}

			// Mark all ancestors of the path (and the path itself) as banned prefixes
			for (const ancestor of pathAncestors(path.path)) {
				bannedPrefixes.set(ancestor, routeInfo);
			}

			// Disallow exact matches for both prefixe and exact
			takenExact.set(path.path, routeInfo);
		}

		// if (issuePaths.size > 0) {
		//     throw new RouteCollisionError(Array.from(issuePaths));
		// }
		return issuePaths;
	}

	/**
	 * A function to look up `QualifiedPathPair` values by their path.
	 *
	 * @param path The pathname the request was made to
	 * @returns The `T` value associated with the path, whether that is an exact
	 * or a prefixed path
	 */
	public resolve(path: string): QualifiedPathPair | null {
		// Try to find an exact match first (generally just an optimization)
		if (this.exactRoutes.has(path)) {
			return this.exactRoutes.get(path)!;
		}

		// Iterate over all ancestors of the path and check if any of the
		// ancestors are a registered prefix.
		//
		// This is speedy enough because the runtime is tied to the length of
		// the path, rather than the number of routes.
		for (const prefix of pathAncestors(path)) {
			if (this.prefixRoutes.has(prefix)) {
				return this.prefixRoutes.get(prefix)!;
			}
		}

		return null;
	}

	public get collisions() {
		let collisions = this._collisions;
		if (!collisions) {
			collisions = PathResolver.getCollisions([
				...this.exactRoutes.values(),
				...this.prefixRoutes.values(),
			]);
			this._collisions = collisions;
		}
		return Array.from(collisions).map((o) => Object.freeze(o));
	}
}

/**
 * Resolves a path to a `QualifiedPathPair` only once.
 *
 * This is used in Cloudflare workers, where we only need to resolve the path
 * once per instance of the runtime, and cannot optimize path lookup by keeping
 * the resolver in memory.
 *
 * ### NOTE: This may return an invalid result if there are multiple routes that match.
 *
 * @param routes The qualified path routes to match on
 * @param path The url path to resolve
 */
export function resolveOnce(routes: QualifiedPathPair[], path: string): QualifiedPathPair | null {
	let currentRoute: QualifiedPathPair | null = null;
	const cleanPath = path.replace(/\/$/, "");

	for (const route of routes) {
		const { isPrefix, path: routePathWithPossibleSlash } = route.path;
		const routePath = routePathWithPossibleSlash.replace(/\/$/, "");

		if (isPrefix) {
			if (cleanPath.startsWith(routePath)) {
				currentRoute = route;
				break;
			}
		} else {
			if (cleanPath === routePath) {
				currentRoute = route;
				break;
			}
		}
	}

	return currentRoute;
}

/**
 * A generator utility function that yields all ancestors of a given path.
 *
 * This includes the inputted path, and is ordered from most deeply nested to
 * least deeply nested.
 *
 * @param path to list the ancestors of
 * @yields Valid ancestor paths as strings
 */
export function* pathAncestors(path: string): IterableIterator<string> {
	let remaining = path;
	while (remaining !== "/" && remaining) {
		yield remaining;

		const lastSlash = remaining.lastIndexOf("/");
		if (lastSlash === -1) {
			break;
		}
		remaining = remaining.slice(0, lastSlash);
	}

	// At this point, output the root, just in case someone used a prefix of
	// "/"
	yield "/";
}
