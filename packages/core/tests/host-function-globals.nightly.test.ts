// Nightly: launches Node through the guest shell, which needs the default
// software bundle (`sh` from coreutils).
import { afterEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { AgentOs } from "../src/index.js";
import { ALLOW_ALL_VM_PERMISSIONS } from "./helpers/permissions.js";

const orderStore = {
	listOrders: {
		inputSchema: z.object({ status: z.string() }),
		execute: ({ status }: { status: string }) => ({
			orders: [{ id: "order-1", status }],
		}),
	},
};

const EXPECTED_RESULT = { orders: [{ id: "order-1", status: "open" }] };

function lastJsonLine(stdout: string): unknown {
	const lines = stdout.trim().split("\n");
	return JSON.parse(lines[lines.length - 1] ?? "");
}

describe("host-function globals in shell-launched Node processes", () => {
	let vm: AgentOs | undefined;

	afterEach(async () => {
		await vm?.dispose();
		vm = undefined;
	});

	test("node run from the guest shell can call host functions", async () => {
		vm = await AgentOs.create({
			permissions: ALLOW_ALL_VM_PERMISSIONS,
			hostFunctions: { orderStore },
		});
		await vm.writeFile(
			"/app/main.mjs",
			`const result = await orderStore.listOrders({ status: "open" });
console.log(JSON.stringify(result));`,
		);

		const decoder = new TextDecoder();
		let stdout = "";
		let stderr = "";
		const { pid } = await vm.process.spawn("sh", ["-c", "node /app/main.mjs"], {
			onStdout: (chunk) => {
				stdout += decoder.decode(chunk);
			},
			onStderr: (chunk) => {
				stderr += decoder.decode(chunk);
			},
		});
		const exit = await vm.process.wait(pid);
		expect({ exitCode: exit.exitCode, stderr }, stdout).toEqual({
			exitCode: 0,
			stderr: "",
		});
		expect(lastJsonLine(stdout)).toEqual(EXPECTED_RESULT);

		const exec = await vm.process.exec("node /app/main.mjs", {
			output: { capture: "all" },
		});
		expect(exec.outcome, JSON.stringify(exec)).toBe("succeeded");
		if (exec.outcome !== "succeeded") return;
		expect(lastJsonLine(exec.stdout ?? "")).toEqual(EXPECTED_RESULT);
	}, 120_000);
});
