import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
	new URL("../.github/workflows/ci.yml", import.meta.url),
	"utf8",
);
function job(name) {
	const body = workflow.split(`\n  ${name}:\n`)[1];
	assert.ok(body, `missing ${name} job`);
	return body.split(/\n  [\w-]+:\n/)[0];
}
function condition(source, key = "if") {
	const match = source.match(new RegExp(`^\\s*${key}: (.+)$`, "m"));
	assert.ok(match, `missing ${key} condition`);
	return match[1];
}
function evaluate(expression, { event, base = "main", labels = [] }) {
	// These selectors use only the small Boolean subset below. Reject unknown
	// expressions instead of accidentally treating unsupported syntax as true.
	const resolved = expression
		.replace(/^\$\{\{\s*|\s*\}\}$/g, "")
		.replaceAll(
			"contains(github.event.pull_request.labels.*.name, 'aggregate-ci')",
			String(labels.includes("aggregate-ci")),
		)
		.replaceAll("always()", "true")
		.replaceAll("github.event_name", JSON.stringify(event))
		.replaceAll("github.base_ref", JSON.stringify(base));
	assert.match(resolved, /^(?:true|false|"[\w-]+"|'[\w-]+'|[\s!=&|()])+$/);
	return Function(`"use strict"; return (${resolved});`)();
}
const commandSteps = job("wasm-commands")
	.split(/\n      - /)
	.slice(1);
function step(identifier) {
	const result = commandSteps.find((source) => source.includes(identifier));
	assert.ok(result, `missing command step ${identifier}`);
	return result;
}
const fullSteps = [
	"Build the complete command corpus",
	"Build required heavy integration commands",
	"Build the pinned Codex WASI artifacts",
	"Build mandatory threaded-WASM conformance fixtures",
	"Stage native/WASM C parity fixtures",
	"Stage the complete command corpus",
	"name: codex-wasi",
	"name: wasm-thread-fixtures",
	"name: wasm-c-parity-fixtures",
];
for (const [name, context, full] of [
	["ordinary PR", { event: "pull_request" }, false],
	[
		"unrelated PR label",
		{ event: "pull_request", labels: ["documentation"] },
		false,
	],
	[
		"aggregate PR to main",
		{ event: "pull_request", labels: ["aggregate-ci"] },
		true,
	],
	[
		"aggregate stacked PR",
		{ event: "pull_request", base: "stack-parent", labels: ["aggregate-ci"] },
		true,
	],
	["main push", { event: "push" }, true],
	["manual dispatch", { event: "workflow_dispatch" }, true],
]) {
	test(`${name} consistently selects its corpus, artifacts, and backend gate`, () => {
		for (const id of [
			"checks",
			"wasm-commands",
			"rust",
			"executor-feature-isolation",
			"core-pr",
			"core-runtime-pr",
			"actor-pr",
			"required",
		]) {
			assert.equal(
				evaluate(condition(job(id)), context),
				true,
				`${id} admitted`,
			);
		}
		for (const id of fullSteps) {
			assert.equal(evaluate(condition(step(id)), context), full, id);
		}
		for (const id of [
			"Build the bounded PR command corpus",
			"Stage the bounded PR command corpus",
		]) {
			assert.equal(evaluate(condition(step(id)), context), !full, id);
		}
		assert.equal(
			evaluate(condition(job("wasm-backend-matrix")), context),
			full,
			"backend matrix admitted",
		);
		assert.equal(
			evaluate(
				condition(job("required"), "EXPECT_WASM_BACKEND_MATRIX"),
				context,
			),
			full,
			"required gate expects matrix success",
		);
	});
}
