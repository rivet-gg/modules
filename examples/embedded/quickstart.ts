// docs:start create
import { AgentOs } from "@rivet-dev/agentos-core";

// `AgentOs.create()` boots a VM inside this process and returns a handle to it.
const vm = await AgentOs.create();
// docs:end create

try {
	// docs:start bash
	const result = await vm.process.exec("echo hello && ls /home/agentos", {
		output: { capture: "all" },
	});

	console.log(result.stdout);
	// docs:end bash

	// docs:start filesystem
	await vm.filesystem.writeFile("/home/agentos/hello.txt", "Hello, world!");

	const file = await vm.filesystem.readFile("/home/agentos/hello.txt");
	// docs:end filesystem
	console.log(new TextDecoder().decode(file));

	// docs:start dev-server
	await vm.filesystem.writeFile(
		"/home/agentos/server.js",
		`require("node:http")
			.createServer((req, res) => res.end("hello"))
			.listen(3000);`,
	);

	await vm.process.spawn("node", ["/home/agentos/server.js"]);

	// The listener stays inside the VM. Send it a request from the host.
	const response = await vm.network.httpRequest({ port: 3000, path: "/" });
	console.log(new TextDecoder().decode(response.body));
	// docs:end dev-server

	// docs:start languages
	await vm.javascript.execute("console.log(1 + 2)");
	await vm.typescript.execute("const n: number = 3; console.log(n)");

	const answer = await vm.python.evaluate<number>("21 * 2");
	// docs:end languages
	console.log(answer.outcome === "succeeded" ? answer.value : answer.error);

	// docs:start cron
	vm.cron.schedule({
		id: "cleanup",
		schedule: "0 * * * *",
		action: { type: "exec", command: "rm", args: ["-rf", "/tmp/cache"] },
	});
	// docs:end cron

	// docs:start software
	// Registry packages are published next to a manifest with each release.
	const base = "https://releases.rivet.dev/agent-os/latest/software/";
	const manifest = (await (await fetch(`${base}manifest.json`)).json()) as {
		artifacts: { name: string; digest: string; path: string }[];
	};
	const ripgrep = manifest.artifacts.find((artifact) => artifact.name === "ripgrep");
	if (!ripgrep) throw new Error("ripgrep is not in the manifest");

	await vm.software.install({
		type: "url",
		url: new URL(ripgrep.path, base).href,
		expectedDigest: ripgrep.digest,
	});
	// docs:end software
} finally {
	await vm.dispose();
}
