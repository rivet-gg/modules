import type { ChildProcess } from "node:child_process";
import { SidecarProcessExited } from "@rivet-dev/agentos-runtime-core/sidecar-client";
import { expect, test } from "vitest";
import { AgentOs } from "../src/index.js";

// Kills the VM's real sidecar process. This reaches into internals only to find
// the process; the behavior under test is the public evaluate() result.
function sidecarChild(vm: AgentOs): ChildProcess {
	return (
		vm as unknown as {
			_sidecarClient: { protocolClient: { child: ChildProcess } };
		}
	)._sidecarClient.protocolClient.child;
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
