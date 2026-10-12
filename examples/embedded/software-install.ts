import { AgentOs } from "@rivet-dev/agentos-core";

// Registry software is published as digest-addressed .aospkg files next to a
// manifest. Use a release version, or `latest`.
const base = "https://releases.rivet.dev/agent-os/latest/software/";
const manifest = (await (await fetch(`${base}manifest.json`)).json()) as {
	artifacts: { name: string; digest: string; path: string }[];
};
const ripgrep = manifest.artifacts.find((artifact) => artifact.name === "ripgrep");
if (!ripgrep) throw new Error("ripgrep is not in the manifest");

const vm = await AgentOs.create();

try {
	// Install a package while the VM is running. The bytes are verified against
	// the digest before the package is projected into /opt/agentos.
	const installed = await vm.software.install({
		type: "url",
		url: new URL(ripgrep.path, base).href,
		expectedDigest: ripgrep.digest,
	});
	console.log(installed.packageName, installed.version, installed.commands);

	const result = await vm.process.execFile("rg", ["--version"], {
		output: { capture: "all" },
	});
	console.log(result.stdout);

	// Packages installed through this API, and every command the VM provides.
	console.log(vm.software.installed());
	console.log(await vm.software.list());

	await vm.software.uninstall(installed.packageId);
} finally {
	await vm.dispose();
}
