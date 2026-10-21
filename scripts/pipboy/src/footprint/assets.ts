import { dirname, join } from "node:path";
import { Effect, FileSystem, Schema } from "effect";
import { ASSET_SEEDS } from "../config.ts";
import { npmEnv, run } from "../exec.ts";
import { readTarball } from "./tarball.ts";

const PackOutput = Schema.fromJsonString(Schema.Tuple([Schema.Struct({ filename: Schema.String })]));

/**
 * Copies the assets in `ASSET_SEEDS` from the latest published tarballs into
 * the checkout at `root`, where the build expects them. Files that already
 * exist, such as a local build's output, are left alone.
 */
export const seedAssets = Effect.fn("Footprint.seedAssets")(function* (root: string) {
	const fs = yield* FileSystem.FileSystem;
	const dir = yield* fs.makeTempDirectoryScoped({ prefix: "pipboy-assets-" });
	let seeded = 0;
	for (const seed of ASSET_SEEDS) {
		const output = yield* run("npm", ["pack", `${seed.package}@latest`, "--pack-destination", dir, "--json"], { env: npmEnv() });
		const [{ filename }] = yield* Schema.decodeUnknownEffect(PackOutput)(output);
		for (const entry of readTarball(yield* fs.readFile(join(dir, filename)))) {
			if (!entry.path.startsWith(seed.from)) continue;
			const target = seed.to(entry.path.slice(seed.from.length));
			if (target === undefined) continue;
			const path = join(root, target);
			if (yield* fs.exists(path)) continue;
			yield* fs.makeDirectory(dirname(path), { recursive: true });
			yield* fs.writeFile(path, entry.data);
			seeded++;
		}
	}
	return seeded;
});
