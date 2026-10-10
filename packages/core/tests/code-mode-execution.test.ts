import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { z } from "zod";
import { AgentOs } from "../src/index.js";
import { ALLOW_ALL_VM_PERMISSIONS } from "./helpers/permissions.js";

// Code mode: a script evaluated in the VM calls host functions, and the caller
// bounds it with timeouts, aborts, and memory limits.

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("code mode execution", () => {
	let vm: AgentOs;
	let callStarts: number[] = [];
	let inFlight = 0;
	let maxInFlight = 0;

	beforeAll(async () => {
		vm = await AgentOs.create({
			permissions: ALLOW_ALL_VM_PERMISSIONS,
			hostFunctions: {
				tools: {
					wait: {
						inputSchema: z.object({ ms: z.number() }),
						execute: async ({ ms }: { ms: number }) => {
							callStarts.push(Date.now());
							inFlight += 1;
							maxInFlight = Math.max(maxInFlight, inFlight);
							await sleep(ms);
							inFlight -= 1;
							return {};
						},
					},
				},
			},
		});
	}, 60_000);

	afterAll(async () => {
		await vm?.dispose();
	});

	beforeEach(() => {
		callStarts = [];
		maxInFlight = 0;
	});

	test("parallel host calls all run at once", async () => {
		const result = await vm.javascript.evaluate(
			"Promise.all(Array.from({ length: 20 }, () => tools.wait({ ms: 300 }))).then(() => true)",
			{ timeoutMs: 10_000 },
		);

		expect(result.outcome).toBe("succeeded");
		expect(maxInFlight).toBe(20);
	}, 30_000);

	test("a timed-out script starts no host calls after it ends", async () => {
		const result = await vm.javascript.evaluate(
			"Promise.all(Array.from({ length: 20 }, () => tools.wait({ ms: 1000 })))",
			{ timeoutMs: 300 },
		);
		const settledAt = Date.now();
		// Calls already running finish within their 1 s sleep.
		await sleep(1_500);

		expect(result.outcome).toBe("timed_out");
		expect(callStarts.filter((startedAt) => startedAt > settledAt)).toEqual([]);
	}, 30_000);

	test("aborting a busy script stops it without the cancel grace period", async () => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), 200);
		const startedAt = Date.now();
		const result = await vm.javascript.evaluate(
			"(() => { while (true) {} })()",
			{
				timeoutMs: 30_000,
				signal: controller.signal,
			},
		);

		expect(result.outcome).toBe("cancelled");
		// Cancellation falls back to a forced stop after a 1 s grace period.
		expect(Date.now() - startedAt).toBeLessThan(900);
		expect(await vm.javascript.evaluate("1 + 1")).toMatchObject({
			outcome: "succeeded",
			value: 2,
		});
	}, 30_000);

	test("a promise that never settles times out", async () => {
		const result = await vm.javascript.evaluate("new Promise(() => {})", {
			timeoutMs: 1_000,
		});

		expect(result.outcome).toBe("timed_out");
	}, 30_000);

	test("one allocation past the heap limit fails only its own script", async () => {
		const result = await vm.javascript.evaluate(
			"'a'.repeat(256 * 1024 * 1024).toUpperCase().length",
			{ timeoutMs: 10_000, output: { capture: "stderr" } },
		);

		expect(result.outcome).toBe("failed");
		expect(result.stderr).toContain(
			"Script execution exceeded the V8 heap limit (limits.jsRuntime.v8HeapLimitMb)",
		);
		expect(await vm.javascript.evaluate("1 + 1")).toMatchObject({
			outcome: "succeeded",
			value: 2,
		});
	}, 30_000);
});
