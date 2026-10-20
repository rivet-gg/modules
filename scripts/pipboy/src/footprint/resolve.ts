import { join, resolve } from "node:path";
import { Effect, FileSystem, Option, Schema } from "effect";
import { REGISTRY_PINNED } from "../config.ts";
import { npmEnv, run } from "../exec.ts";
import type { PackageNode, SideName } from "../schema/footprint.ts";
import { readPackManifest } from "./pack.ts";
import { Registry } from "./registry.ts";
import { readTarball, unpackedSize } from "./tarball.ts";

const StringRecord = Schema.Record(Schema.String, Schema.String);

const LockEntry = Schema.Struct({
	name: Schema.optionalKey(Schema.String),
	version: Schema.optionalKey(Schema.String),
	resolved: Schema.optionalKey(Schema.String),
	dependencies: Schema.optionalKey(StringRecord),
	optionalDependencies: Schema.optionalKey(StringRecord),
	peerDependencies: Schema.optionalKey(StringRecord),
	peerDependenciesMeta: Schema.optionalKey(
		Schema.Record(
			Schema.String,
			Schema.Struct({ optional: Schema.optionalKey(Schema.Boolean) }),
		),
	),
	os: Schema.optionalKey(Schema.Array(Schema.String)),
	cpu: Schema.optionalKey(Schema.Array(Schema.String)),
	libc: Schema.optionalKey(Schema.Array(Schema.String)),
	hasInstallScript: Schema.optionalKey(Schema.Boolean),
});
type LockEntry = Schema.Schema.Type<typeof LockEntry>;

const Lockfile = Schema.Struct({
	lockfileVersion: Schema.Literal(3),
	packages: Schema.Record(Schema.String, LockEntry),
});

export type SideInput =
	| { readonly side: "latest"; readonly roots: ReadonlyArray<string> }
	| { readonly side: Exclude<SideName, "latest">; readonly tarballDir: string };

const TarballManifest = Schema.Struct({
	dependencies: Schema.optionalKey(StringRecord),
	optionalDependencies: Schema.optionalKey(StringRecord),
	peerDependencies: Schema.optionalKey(StringRecord),
});

/**
 * Resolves a side's dependency trees exactly as `npm install` would, without
 * downloading them: `npm install --package-lock-only` writes a lockfile, and
 * sizes come from registry metadata. Install scripts never run.
 *
 * Each root resolves in its own project, as a user installs one package. A
 * conflict between two of our packages, such as a stale peer range, then
 * can't break the measurement of the others. Node keys are prefixed with the
 * root's name, so the trees never collide.
 */
export const resolveSide = Effect.fn("Footprint.resolveSide")(function* (
	input: SideInput,
) {
	const fs = yield* FileSystem.FileSystem;
	const registry = yield* Registry;

	/** `name -> latest version` for the packages in `names` that are published. */
	const latestVersions = (names: ReadonlyArray<string>) =>
		Effect.forEach(
			names,
			(name) =>
				registry
					.latestVersion(name)
					.pipe(Effect.map((v) => [name, v] as const)),
			{
				concurrency: 16,
			},
		).pipe(
			Effect.map((pairs) =>
				Object.fromEntries(
					pairs.flatMap(([name, v]) =>
						Option.isSome(v) ? [[name, v.value]] : [],
					),
				),
			),
		);

	const pinned = yield* latestVersions(REGISTRY_PINNED);
	const localTarballs = new Map<string, string>();
	/** Root name to the dependencies of the project that installs it. */
	const projects = new Map<string, Record<string, string>>();
	if (input.side === "latest") {
		for (const [name, version] of Object.entries(
			yield* latestVersions(input.roots),
		))
			projects.set(name, { [name]: version });
	} else {
		const manifestDir = resolve(input.tarballDir);
		const manifest = yield* readPackManifest(manifestDir);
		for (const [name, file] of Object.entries(manifest.tarballs))
			localTarballs.set(name, join(manifestDir, file));
		// Packed packages depend on each other at `PACK_VERSION`, which only exists as a local tarball.
		const workspaceDeps = new Map<string, Array<string>>();
		for (const [name, path] of localTarballs) {
			const entry = readTarball(yield* fs.readFile(path)).find(
				(e) => e.path === "package/package.json",
			);
			const pkg = yield* Schema.decodeUnknownEffect(
				Schema.fromJsonString(TarballManifest),
			)(new TextDecoder().decode(entry?.data));
			const specs = {
				...pkg.dependencies,
				...pkg.optionalDependencies,
				...pkg.peerDependencies,
			};
			workspaceDeps.set(
				name,
				Object.keys(specs).filter(
					(dep) => specs[dep] === manifest.version && localTarballs.has(dep),
				),
			);
		}
		for (const name of localTarballs.keys()) {
			const closure = new Set([name]);
			for (const dep of closure)
				for (const next of workspaceDeps.get(dep) ?? []) closure.add(next);
			projects.set(
				name,
				Object.fromEntries(
					[...closure].map((dep) => [dep, `file:${localTarballs.get(dep)}`]),
				),
			);
		}
	}

	const npmVersion = (yield* run("npm", ["--version"], {
		env: npmEnv(),
	})).trim();
	const nodes: Record<string, PackageNode> = {};
	const roots: Record<string, string> = {};
	yield* Effect.forEach(
		projects,
		([root, dependencies]) =>
			Effect.gen(function* () {
				const dir = yield* fs.makeTempDirectoryScoped({
					prefix: `pipboy-${input.side}-`,
				});
				yield* fs.writeFileString(
					join(dir, "package.json"),
					JSON.stringify({
						name: `pipboy-${input.side}`,
						private: true,
						dependencies,
						overrides: pinned,
					}),
				);
				yield* run(
					"npm",
					[
						"install",
						"--package-lock-only",
						"--ignore-scripts",
						"--no-audit",
						"--no-fund",
					],
					{ cwd: dir, env: npmEnv() },
				);
				const lockfile = yield* fs
					.readFileString(join(dir, "package-lock.json"))
					.pipe(
						Effect.flatMap(
							Schema.decodeUnknownEffect(Schema.fromJsonString(Lockfile)),
						),
					);
				const prefixed = (key: string) => `${root}::${key}`;

				const entries = Object.entries(lockfile.packages).filter(
					([key]) => key !== "",
				);
				yield* Effect.forEach(
					entries,
					([key, entry]) =>
						Effect.gen(function* () {
							const name = packageName(key, entry);
							const local = localTarballs.get(name);
							const bytes =
								local !== undefined
									? unpackedSize(yield* fs.readFile(local))
									: yield* registry.packageSize(name, entry.version ?? "");
							nodes[prefixed(key)] = {
								name,
								version: entry.version ?? "",
								bytes,
								...(entry.os ? { os: entry.os } : {}),
								...(entry.cpu ? { cpu: entry.cpu } : {}),
								...(entry.libc ? { libc: entry.libc } : {}),
								installScript: entry.hasInstallScript ?? false,
								deps: installedDependencies(entry).flatMap((dep) => {
									const found = lookup(lockfile.packages, key, dep);
									return found === undefined ? [] : [prefixed(found)];
								}),
								zeroXRanges: Object.fromEntries(
									Object.entries({
										...entry.dependencies,
										...entry.optionalDependencies,
									}).filter(([, range]) => /^\^0\./.test(range)),
								),
							};
						}),
					{ concurrency: 32, discard: true },
				);
				const rootKey = lookup(lockfile.packages, "", root);
				if (rootKey !== undefined) roots[root] = prefixed(rootKey);
			}),
		{ concurrency: 4, discard: true },
	);
	return { side: input.side, npmVersion, roots, nodes, entrypoints: {} };
});

function packageName(key: string, entry: LockEntry): string {
	return (
		entry.name ??
		key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length)
	);
}

/** Dependencies npm installs by default: regular, optional, and non-optional peers. */
function installedDependencies(entry: LockEntry): Array<string> {
	const peers = Object.keys(entry.peerDependencies ?? {}).filter(
		(name) => entry.peerDependenciesMeta?.[name]?.optional !== true,
	);
	return [
		...Object.keys(entry.dependencies ?? {}),
		...Object.keys(entry.optionalDependencies ?? {}),
		...peers,
	];
}

/** Node's module lookup over lockfile keys: nearest `node_modules` first, then each ancestor. */
function lookup(
	packages: Record<string, unknown>,
	from: string,
	dep: string,
): string | undefined {
	let base = from;
	while (true) {
		const candidate =
			base === "" ? `node_modules/${dep}` : `${base}/node_modules/${dep}`;
		if (candidate in packages) return candidate;
		if (base === "") return undefined;
		const parent = base.lastIndexOf("/node_modules/");
		base = parent === -1 ? "" : base.slice(0, parent);
	}
}
