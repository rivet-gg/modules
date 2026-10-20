import { describe, expect, it } from "vitest";
import {
	DEFAULT_SOFTWARE_REGISTRY_URL,
	resolveRegistrySoftware,
} from "../src/software-registry.js";

// Reaches the published registry, so it runs only in the nightly suite.
describe("published software registry", () => {
	it("resolves git from the latest release manifest", async () => {
		const resolved = await resolveRegistrySoftware("git", {
			version: "latest",
			registry: { url: DEFAULT_SOFTWARE_REGISTRY_URL },
		});
		expect(resolved.url).toMatch(
			/^https:\/\/releases\.rivet\.dev\/agent-os\/latest\/software\/packages\/git\/[0-9a-f]{64}\.aospkg$/,
		);
		expect(resolved.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
		const head = await fetch(resolved.url, { method: "HEAD" });
		expect(head.status).toBe(200);
	}, 60_000);
});
