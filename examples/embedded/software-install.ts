import { AgentOs } from "@rivet-dev/agentos-core";

const vm = await AgentOs.create();

try {
	// Install a package while the VM is running. The bytes are verified against
	// the digest before the package is projected into /opt/agentos.
	const installed = await vm.software.install({
		type: "url",
		url: "https://packages.example.com/ripgrep.aospkg",
		expectedDigest: "sha256:<64 lowercase hex characters>",
	});
	console.log(installed.packageName, installed.version, installed.commands);

	const result = await vm.process.exec("rg --version", {
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
