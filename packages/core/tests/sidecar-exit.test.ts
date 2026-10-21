import type { ChildProcess } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SidecarProcessExited } from "@rivet-dev/agentos-runtime-core/sidecar-client";
import { expect, test } from "vitest";
import { AgentOs } from "../src/index.js";
import {
	NativeSidecarProcessClient,
	serializeRootFilesystemForSidecar,
} from "../src/sidecar/rpc-client.js";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SIDECAR_BINARY = process.env.AGENTOS_SIDECAR_BIN
	? resolve(process.env.AGENTOS_SIDECAR_BIN)
	: join(REPO_ROOT, "target/debug/agentos-native-sidecar");

// Kills the VM's real sidecar process. This reaches into internals only to find
// the process; the behavior under test is the public evaluate() result.
function protocolClient(vm: AgentOs): {
	child: ChildProcess;
	failPermanently(error: Error): void;
} {
	return (
		vm as unknown as {
			_sidecarClient: {
				protocolClient: {
					child: ChildProcess;
					failPermanently(error: Error): void;
				};
			};
		}
	)._sidecarClient.protocolClient;
}

function sidecarChild(vm: AgentOs): ChildProcess {
	return protocolClient(vm).child;
}

test("a running evaluation rejects when its sidecar exits", async () => {
	// A dedicated sidecar keeps the killed process out of the shared pool.
	const sidecar = await AgentOs.createSidecar();
	const vm = await AgentOs.create({
		sidecar: { kind: "explicit", handle: sidecar },
	});
	try {
		const evaluation = vm.javascript.evaluate("(() => { while (true) {} })()", {
			timeoutMs: 30_000,
		});
		await new Promise((resolve) => setTimeout(resolve, 300));
		sidecarChild(vm).kill("SIGKILL");

		await expect(evaluation).rejects.toBeInstanceOf(SidecarProcessExited);
	} finally {
		await vm.dispose().catch(() => {});
		await sidecar.dispose().catch(() => {});
	}
}, 60_000);

test("a shared pool replaces its sidecar after the process dies", async () => {
	const pool = `crash-${process.pid}`;
	const orphan = await AgentOs.create({ sidecar: { kind: "shared", pool } });
	const fresh = await (async () => {
		await orphan.filesystem.writeFile("/tmp/who", "orphan");
		sidecarChild(orphan).kill("SIGKILL");

		// A VM whose sidecar died fails fast with a typed error.
		await expect(orphan.filesystem.readFile("/tmp/who")).rejects.toBeInstanceOf(
			SidecarProcessExited,
		);

		// A new VM in the same pool gets a working sidecar.
		const vm = await AgentOs.create({ sidecar: { kind: "shared", pool } });
		await vm.filesystem.writeFile("/tmp/who", "fresh");
		expect(
			new TextDecoder().decode(await vm.filesystem.readFile("/tmp/who")),
		).toBe("fresh");
		return vm;
	})();
	// A VM whose sidecar died still shuts down cleanly.
	await expect(orphan.dispose()).resolves.toBeUndefined();
	await fresh.dispose();
}, 60_000);

test("a sidecar whose transport fails is stopped, not leaked", async () => {
	const pool = `transport-failure-${process.pid}`;
	const broken = await AgentOs.create({ sidecar: { kind: "shared", pool } });
	const child = sidecarChild(broken);
	const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
	// A transport can fail while the process still runs, for example on an
	// event buffer overflow or an undecodable frame.
	protocolClient(broken).failPermanently(new Error("simulated frame decode failure"));

	// The sidecar process does not keep running with its VMs out of reach.
	await expect(
		Promise.race([
			exited.then(() => "exited"),
			new Promise((resolve) => setTimeout(() => resolve("still running"), 5_000)),
		]),
	).resolves.toBe("exited");
	// The pool replaces it.
	const fresh = await AgentOs.create({ sidecar: { kind: "shared", pool } });
	await fresh.filesystem.writeFile("/tmp/ok", "ok");
	await broken.dispose().catch(() => {});
	await fresh.dispose();
}, 60_000);

test("a sidecar outlives more VM create and dispose cycles than its event buffer holds", async () => {
	const eventBufferCapacity = 8;
	const client = NativeSidecarProcessClient.spawn({
		cwd: REPO_ROOT,
		command: SIDECAR_BINARY,
		eventBufferCapacity,
	});
	try {
		const session = await client.authenticateAndOpenSession();
		// Each cycle leaves lifecycle events that no caller waits for.
		for (let cycle = 0; cycle < eventBufferCapacity * 2; cycle += 1) {
			const vm = await client.createVm(session, {
				runtime: "java_script",
				config: {
					env: {},
					rootFilesystem: serializeRootFilesystemForSidecar(),
				},
			});
			await client.waitForEvent(
				{
					type: "vm_lifecycle",
					ownership: {
						scope: "vm",
						connection_id: session.connectionId,
						session_id: session.sessionId,
						vm_id: vm.vmId,
					},
					state: "ready",
				},
				10_000,
			);
			await client.disposeVm(session, vm);
		}
	} catch (error) {
		await client.dispose().catch(() => {});
		throw error;
	}
	await client.dispose();
}, 60_000);
