// docs:start create
import { AgentOs } from "@rivet-dev/agentos-core";

// `AgentOs.create()` boots a VM inside this process and returns a handle to it.
const vm = await AgentOs.create();
// docs:end create

try {
	// docs:start files-processes
	await vm.filesystem.writeFile("/home/agentos/hello.txt", "Hello, world!");

	const result = await vm.process.execFile("cat", ["/home/agentos/hello.txt"], {
		output: { capture: "all" },
	});
	console.log(result.stdout);
	// docs:end files-processes

	// docs:start output
	await vm.filesystem.writeFile(
		"/home/agentos/server.js",
		'require("http").createServer((req, res) => res.end("ok")).listen(3000); console.log("listening");',
	);
	const server = await vm.process.spawn("node", ["/home/agentos/server.js"], {
		output: { retainEvents: true },
	});

	// Later, page through the retained output with a cursor
	const { events, nextCursor } = await vm.process.readOutput(server.pid);
	console.log(events.length, nextCursor);
	// docs:end output

	// docs:start languages
	await vm.javascript.execute("console.log(1 + 2)");

	const answer = await vm.python.evaluate<number>("21 * 2");
	console.log(answer.outcome === "succeeded" ? answer.value : answer.error);
	// docs:end languages

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
