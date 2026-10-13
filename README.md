<div align="center">
  <a href="https://rivet.dev/agentos">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./.github/media/logo/agentos-white.svg">
      <img src="./.github/media/logo/agentos-black.svg" alt="agentOS" height="75">
    </picture>
  </a>
  <br/>
  <br/>
  <h3>Run Linux in sandboxes that boot in milliseconds. Powered by WebAssembly.</h3>
  <p>
    92× faster cold starts, 47× less memory, 254× cheaper to run.<br/>
    Each agent gets files, processes, shell, and networking in one lightweight OS.
  </p>
  <p>
    <a href="#quickstart">Quickstart</a> •
    <a href="https://rivet.dev/agentos/docs">Documentation</a> •
    <a href="https://www.rivet.dev/changelog">Changelog</a> •
    <a href="https://www.rivet.dev/discord">Discord</a> •
    <a href="https://x.com/rivet_dev">X</a>
  </p>
</div>

## Why agentOS

Powered by WebAssembly and V8 isolates, the same technology powering Chrome and
Cloudflare Workers. Linux with POSIX files, processes, and networking.

- **Library, not extra infrastructure.** Install agentOS from npm and run it inside the backend process you already operate.
- **WebAssembly + V8, not a microVM.** V8 isolates run JavaScript while WebAssembly contains compiled tools inside the same compact runtime.
- **Direct function calls, not extra APIs.** Connect agents to your application with ordinary JavaScript calls instead of another network service.
- **Scoped access, not exposed credentials.** Bind trusted host functions without ever giving the agent your raw secrets.
- **One process, not a VM per agent.** Many isolated agent operating systems share one compact runtime instead of duplicating a full microVM stack.
- **Runs anywhere, no nested virtualization.** Deploy on standard Linux infrastructure without a hypervisor or nested virtualization.

## Quickstart

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/media/library-vs-hosted-dark.svg">
  <img src="./.github/media/library-vs-hosted-light.svg" alt="Library: agentOS runs as a VM inside your backend. Hosted: your backend and frontend call an agentOS VM over HTTP." width="560">
</picture>

|  | Hosted | Library |
|---|---|---|
| **Runs** | Durable instance on Rivet Cloud or self-hosted | Inside your process |
| **Lifecycle** | Sleeps when idle unless a process is running | Runs until `dispose()` or process exit |
| **Clients** | Your backend, or browsers with a scoped JWT | Your backend |
| **Preview URLs** | Expiring preview URLs | None |

### Hosted

**Step 1: Create a project**

Create a project in the [Rivet dashboard](https://dashboard.rivet.dev) and
choose agentOS as the product. Set `RIVET_NAMESPACE` and `RIVET_TOKEN` from
the project. To run on your own infrastructure, see
[Self-Hosting](https://rivet.dev/agentos/docs/self-hosting).

**Step 2: Install the client**

```bash
npm install @rivet-dev/agentos
```

**Step 3: Create a VM and use it**

```ts
import { createAgentOsClient } from "@rivet-dev/agentos";

const client = createAgentOsClient({ endpoint: "https://api.rivet.dev" });

// Creates the VM on first use and returns the same VM for the same key.
const vm = client.agentOS.getOrCreate(["my-vm"]);

const result = await vm.v1.process.run({
	command: "sh",
	args: ["-c", "echo hello && ls /home/agentos"],
	options: { captureStdio: true },
});
console.log(result.stdout);

await vm.v1.filesystem.writeFile({
	path: "/home/agentos/hello.txt",
	content: "Hello, world!",
});

// Start a server and expose it through an expiring preview URL.
await vm.v1.filesystem.writeFile({
	path: "/home/agentos/server.js",
	content: `require("node:http").createServer((req, res) => res.end("hello")).listen(3000);`,
});
await vm.v1.process.spawn({ command: "node", args: ["/home/agentos/server.js"] });
const preview = await vm.v1.network.preview.create({ port: 3000, ttlMs: 60 * 60 * 1_000 });

await vm.v1.python.evaluate({ expression: "21 * 2" });
```

The client is optional. Every action is a plain HTTP call: create the VM by
key with your `RIVET_TOKEN`, then call `POST /gateway/{vm_id}/action/v1.{group}.{action}`
with a token that can reach the VM.

<details>
<summary>Raw HTTP with curl</summary>

```bash
curl -X PUT "https://api.rivet.dev/actors?namespace=$RIVET_NAMESPACE" \
  -H "Authorization: Bearer $RIVET_TOKEN" \
  --json '{
    "name": "agentOS",
    "key": "my-vm",
    "runner_name_selector": "services",
    "crash_policy": "sleep"
  }'
# → { "actor": { "actor_id": "…" }, "created": true }

curl "https://api.rivet.dev/gateway/$VM_ID/action/v1.process.run" \
  -H "x-rivet-token: $VM_TOKEN" \
  --json '{"args": [{
    "command": "sh",
    "args": ["-c", "echo hello"],
    "options": { "captureStdio": true }
  }]}'
# → { "output": { "status": { "exitCode": 0, … }, "stdout": "hello\n", "stderr": "" } }
```

</details>

Keep `RIVET_TOKEN` on your backend. To let a browser call one VM directly,
issue it a JWT scoped to that VM. See the
[hosted quickstart](https://rivet.dev/agentos/docs/quickstart-hosted) and the
[Hosted HTTP API](https://rivet.dev/agentos/docs/hosted-api).

### Library

**Step 1: Install the library**

```bash
npm install @rivet-dev/agentos-core
```

**Step 2: Create a VM**

```ts
import { AgentOs } from "@rivet-dev/agentos-core";

// Boots a VM inside this process. It runs until dispose() or process exit.
const vm = await AgentOs.create();
```

**Step 3: Use it**

```ts
try {
	const result = await vm.process.exec("echo hello && ls /home/agentos", {
		output: { capture: "all" },
	});
	console.log(result.stdout);

	await vm.filesystem.writeFile("/home/agentos/hello.txt", "Hello, world!");
	const file = await vm.filesystem.readFile("/home/agentos/hello.txt");

	// Start a server. The listener stays inside the VM; send it a request from the host.
	await vm.filesystem.writeFile(
		"/home/agentos/server.js",
		`require("node:http").createServer((req, res) => res.end("hello")).listen(3000);`,
	);
	await vm.process.spawn("node", ["/home/agentos/server.js"]);
	const response = await vm.network.httpRequest({ port: 3000, path: "/" });

	await vm.javascript.execute("console.log(1 + 2)");
	await vm.typescript.execute("const n: number = 3; console.log(n)");
	const answer = await vm.python.evaluate<number>("21 * 2");

	vm.cron.schedule({
		id: "cleanup",
		schedule: "0 * * * *",
		action: { type: "exec", command: "rm", args: ["-rf", "/tmp/cache"] },
	});
} finally {
	await vm.dispose();
}
```

The filesystem is in memory by default. To keep files across VM recreation,
store the root filesystem in SQLite; see
[examples/embedded/persistence.ts](examples/embedded/persistence.ts). See the
[library quickstart](https://rivet.dev/agentos/docs/quickstart) for software
installs, host functions, permissions, and resource limits.

## API Overview

Both modes expose the same capability groups. Hosted actions live under
`vm.v1.<group>` and take a single input object; library methods live under
`vm.<group>` and take positional arguments.

| Group | What it does | Hosted (`vm.v1.*`) | Library (`vm.*`) |
|---|---|---|---|
| `process` | Run commands and manage child processes | `run`, `spawn`, `get`, `list`, `tree`, `wait`, `signal`, `stdin.write`, `stdin.close`, `pty.resize`, `output.read` | `exec`, `execFile`, `spawn`, `get`, `list`, `tree`, `wait`, `signal`, `kill`, `writeStdin`, `closeStdin`, `resizePty`, `readOutput` |
| `terminal` | Interactive PTY sessions | `open`, `list`, `stdin.write`, `pty.resize`, `output.read`, `wait`, `close` | `open`, `write`, `resize`, `wait`, `close` |
| `filesystem` | Read, write, and list files; manage mounts | `readFile`, `writeFile`, `readFiles`, `writeFiles`, `stat`, `exists`, `mkdir`, `readdir`, `readdirEntries`, `readdirRecursive`, `move`, `remove`, `listMounts`, `export` | Same, plus `mount` and `unmount` |
| `javascript` | Run Node.js code and npm | `execute`, `evaluate`, `executeFile`, `spawn`, `spawnFile`, `npm.install`, `npm.runScript`, `npm.runPackage` | Same |
| `typescript` | Run and type-check TypeScript | `execute`, `evaluate`, `executeFile`, `spawn`, `spawnFile`, `check`, `checkProject` | Same |
| `python` | Run Python code and pip | `execute`, `evaluate`, `executeFile`, `executeModule`, `spawn`, `spawnFile`, `spawnModule`, `install` | Same |
| `contexts` | Persistent language execution contexts | `create`, `get`, `list`, `reset`, `delete` | `get`, `list`, `reset`, `delete` |
| `network` | Reach servers running in the VM | `fetch`, `fetchStream.*`, `preview.create`, `preview.expire` | `httpRequest` |
| `software` | Install `.aospkg` command packages | `install`, `uninstall`, `list` | `install`, `uninstall`, `list`, `installed`, `link` |
| `cron` | Scheduled commands | `schedule`, `list`, `cancel` | `schedule`, `list`, `cancel` |
| `config` | Stored, versioned VM configuration | `get`, `set`, `patch` | Passed to `AgentOs.create()` |
| `vm` | VM status and restart | `status`, `restart` | `AgentOs.create()`, `dispose()` |

Software packages are immutable `.aospkg` artifacts, verified against their
digest and linked under `/opt/agentos/bin`. Hosted VMs install from a URL;
the library also accepts trusted local package paths. Runtime software is not
resolved from npm.

## Repository

This repository owns the native sidecar, VM kernel and VFS, language execution,
the software package format and cache, the TypeScript and Rust Core clients,
and the docs. Hosted orchestration adapters live in the services repository.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm check-types
cargo check --workspace
```

Rebuild the complete command catalog and stage the local object-store release
layout with:

```bash
just tools-rebuild
just software-artifacts-dry-run
```

## License

See [LICENSE](LICENSE).
