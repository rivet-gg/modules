import { assertEquals, assertThrows } from "@std/assert";
import { getReleaseFileName } from "./resolver.ts";

Deno.test("getPostgresFileName", async (t) => {
	interface TestCase {
		version: string;
		os: typeof Deno.build.os;
		arch: typeof Deno.build.arch;
		expected: string;
	}

	const testCases: TestCase[] = [
		{ version: "16.4.0", os: "darwin", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-apple-darwin.tar.gz" },
		{ version: "16.4.0", os: "darwin", arch: "aarch64", expected: "postgresql-16.4.0-aarch64-apple-darwin.tar.gz" },
		{ version: "16.4.0", os: "linux", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "linux", arch: "aarch64", expected: "postgresql-16.4.0-aarch64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "windows", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-pc-windows-msvc.tar.gz" },
		{
			version: "16.4.0",
			os: "android",
			arch: "aarch64",
			expected: "postgresql-16.4.0-aarch64-unknown-linux-gnu.tar.gz",
		},
		{ version: "16.4.0", os: "freebsd", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "netbsd", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "aix", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "solaris", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
		{ version: "16.4.0", os: "illumos", arch: "x86_64", expected: "postgresql-16.4.0-x86_64-unknown-linux-gnu.tar.gz" },
	];

	for (const testCase of testCases) {
		await t.step(`${testCase.os} ${testCase.arch}`, () => {
			const result = getReleaseFileName(testCase.version, testCase.os, testCase.arch);
			assertEquals(result, testCase.expected);
		});
	}

	await t.step("Unsupported architecture", () => {
		assertThrows(() => getReleaseFileName("16.4.0", "linux", "arm" as any), Error, "Unsupported architecture: arm");
	});
});
