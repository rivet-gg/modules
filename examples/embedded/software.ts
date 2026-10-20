import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentOs } from "@rivet-dev/agentos-core";

// Registry software is published as digest-addressed .aospkg files next to a
// manifest. Use a release version, or `latest`.
const base = "https://releases.rivet.dev/agent-os/latest/software/";
const { artifacts } = (await (await fetch(`${base}manifest.json`)).json()) as {
	artifacts: { name: string; digest: string; path: string }[];
};

// The library installs packages at creation from trusted local paths, so
// download each registry package once, verify its digest, and reuse the file.
async function downloadPackage(name: string): Promise<string> {
	const artifact = artifacts.find((entry) => entry.name === name);
	if (!artifact) throw new Error(`${name} is not in the manifest`);
	const hex = artifact.digest.replace(/^sha256:/, "");
	const cacheDir = join(tmpdir(), "agentos-software");
	const packagePath = join(cacheDir, `${name}-${hex}.aospkg`);
	if (existsSync(packagePath)) return packagePath;

	const response = await fetch(new URL(artifact.path, base));
	if (!response.ok)
		throw new Error(`download ${name}: HTTP ${response.status}`);
	const bytes = new Uint8Array(await response.arrayBuffer());
	const actual = createHash("sha256").update(bytes).digest("hex");
	if (actual !== hex) throw new Error(`${name} digest mismatch: ${actual}`);
	await mkdir(cacheDir, { recursive: true });
	await writeFile(packagePath, bytes);
	return packagePath;
}

// The default bundle (sh, coreutils, and the standard CLI tools) is installed
// first, then the packages listed here.
const vm = await AgentOs.create({
	software: [{ packagePath: await downloadPackage("git") }],
});

try {
	const result = await vm.process.exec("git --version", {
		output: { capture: "all" },
	});
	console.log(result.stdout);
} finally {
	await vm.dispose();
}
