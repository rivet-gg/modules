import type { SoftwarePackageRef } from "./agentos-package.js";

// ── Software Descriptor Types ────────────────────────────────────────

/**
 * Install a package from the agentOS software registry by name. `version`
 * selects the release manifest and defaults to `softwareRegistry.version`,
 * then to this client's own release.
 */
export interface RegistrySoftwareRef {
	registry: string;
	version?: string;
}

/**
 * Install a `.aospkg` from an http(s) URL. Pass `digest`
 * (`sha256:<64 lowercase hex>`) so the bytes are verified before install.
 */
export interface UrlSoftwareRef {
	url: string;
	digest?: string;
}

/**
 * Input type for the `software` option: a trusted local `{ packagePath }`, a
 * registry package `{ registry }`, or a `{ url, digest }` artifact. Accepts an
 * entry or an array of entries for meta-packages.
 */
export type SoftwareEntry =
	| SoftwarePackageRef
	| RegistrySoftwareRef
	| UrlSoftwareRef;
export type SoftwareInput = SoftwareEntry | SoftwareEntry[];

/** Host-to-VM path mapping for a software package's `/root/node_modules/<pkg>` mount. */
export interface SoftwareRoot {
	hostPath: string;
	vmPath: string;
}

// ── defineSoftware ───────────────────────────────────────────────────

/**
 * Define a software descriptor. A type-safe identity function that validates the
 * package-dir reference at compile time. The sidecar materializes the package into
 * the `/opt/agentos` projection.
 */
export function defineSoftware<T extends SoftwareEntry>(desc: T): T {
	return desc;
}
