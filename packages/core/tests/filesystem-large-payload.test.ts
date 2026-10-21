import { afterEach, beforeEach, expect, test } from "vitest";
import { AgentOs } from "../src/index.js";

let vm: AgentOs;

beforeEach(async () => {
	vm = await AgentOs.create({ defaultSoftware: false });
});

afterEach(async () => {
	await vm.dispose();
});

test("a file larger than one encoder buffer round-trips through the sidecar", async () => {
	const content = new Uint8Array(256 * 1024).map((_, index) => index % 251);

	await vm.filesystem.writeFile("/tmp/large.bin", content);

	const roundTripped = await vm.filesystem.readFile("/tmp/large.bin");
	expect(new Uint8Array(roundTripped)).toEqual(content);
}, 60_000);
