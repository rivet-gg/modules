import { expect, test } from "vitest";
import { AgentOs } from "../src/index.js";

// The sidecar's stderr is forwarded to the host's stderr, so anything it prints
// lands in the user's terminal. This reaches into internals only to read the
// copy the client keeps of that stream.
function sidecarStderr(vm: AgentOs): string {
	return (
		vm as unknown as {
			_sidecarClient: {
				protocolClient: { sidecarProcess: { stderrText(): string } };
			};
		}
	)._sidecarClient.protocolClient.sidecarProcess.stderrText();
}

test("ordinary JavaScript and shell runs print no runtime diagnostics to the terminal", async () => {
	// A dedicated sidecar keeps output from other tests out of the captured stream.
	const sidecar = await AgentOs.createSidecar();
	const vm = await AgentOs.create({
		sidecar: { kind: "explicit", handle: sidecar },
	});
	try {
		// Several runs claim, refill, and evict warm V8 workers.
		for (let i = 0; i < 3; i++) {
			expect(await vm.javascript.evaluate(`${i} + 1`)).toMatchObject({
				outcome: "succeeded",
				value: i + 1,
			});
		}
		expect((await vm.exec("echo hi")).stdout).toBe("hi\n");

		expect(sidecarStderr(vm)).toBe("");
	} finally {
		await vm.dispose();
		await sidecar.dispose();
	}
}, 120_000);
