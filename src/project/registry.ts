import { exists, resolve, emptyDir } from "../deps.ts";
import {
	RegistryConfig,
	RegistryConfigGit,
	RegistryConfigLocal,
} from "../config/project.ts";

export interface Registry {
	path: string;
	name: string;
	config: RegistryConfig;
}

/**
 * Clones a registry to the local machine if required and returns the path.
 */
export async function loadRegistry(
	projectRoot: string,
	name: string,
	config: RegistryConfig,
): Promise<Registry> {
	let path: string;
	if ("local" in config) {
		path = await resolveRegistryLocal(projectRoot, config.local);
	} else if ("git" in config) {
		path = await resolveRegistryGit(projectRoot, name, config.git);
	} else {
		// Unknown project config
		throw new Error("Unreachable");
	}

	return {
		path,
		name,
		config,
	};
}

async function resolveRegistryLocal(
	projectRoot: string,
	config: RegistryConfigLocal,
): Promise<string> {
	// Check that registry exists
	const path = resolve(projectRoot, config.directory);
	if (!await exists(path)) {
		throw new Error(`Registry not found at ${path}`);
	}
	return path;
}

async function resolveRegistryGit(
	projectRoot: string,
	name: string,
	config: RegistryConfigGit,
): Promise<string> {
	const repoPath = resolve(projectRoot, "_gen", "git_registries", name);
	const gitRef = resolveGitRef(config);

	// Clone repo if needed
	if (!await exists(resolve(repoPath, ".git"))) {
		// List what remote endpoints to try
		//
		// This is important since we don't know if the user is authenticated with Git via SSH or HTTPS
		const urlList = [];
		if (typeof config.url === "string") {
			urlList.push(config.url);
		} else if (typeof config === "object") {
			if (config.url.https) urlList.push(config.url.https);
			if (config.url.ssh) urlList.push(config.url.ssh);
		}

		// Test each endpoint
		let originUrl: string | undefined;
		for (const url of urlList) {
			const lsRemoteCommand = await new Deno.Command("git", {
				args: ["ls-remote", url],
			}).output();
			if (lsRemoteCommand.success) {
				originUrl = url;
				break;
			}
		}

		// If no valid endpoint was found
		if (!originUrl) {
			throw new Error(`Failed to find valid git endpoint for registry ${name}`);
		}

		console.log('📦 Cloning git registry', originUrl)

		// Remove potentially dirty existing directory
		await emptyDir(repoPath);

		// Clone repo
		const cloneOutput = await new Deno.Command("git", {
			args: ["clone", "--single-branch", originUrl, repoPath],
		}).output();
		if (!cloneOutput.success) {
			throw new Error(
				`Failed to clone registry ${originUrl}:\n${
					new TextDecoder().decode(cloneOutput.stderr)
				}`,
			);
		}
	}

    // Discard any changes
	const unstagedDiffOutput = await new Deno.Command("git", {
		cwd: repoPath,
		args: ["diff", "--quiet"],
	}).output();
	const stagedDiffOutput = await new Deno.Command("git", {
		cwd: repoPath,
		args: ["diff", "--quiet", "--cached"],
	}).output();
	if (!unstagedDiffOutput.success || !stagedDiffOutput.success) {
        console.warn("💣 Discarding changes in git registry", name);

		const resetOutput = await new Deno.Command("git", {
			cwd: repoPath,
			args: ["reset", "--hard"],
		}).output();
		if (!resetOutput.success) {
			throw new Error(
				`Failed to reset registry ${name}:\n${
					new TextDecoder().decode(resetOutput.stderr)
				}`,
			);
		}
	}

	// Check if rev exists locally, if not try fetch it
	const catOutput = await new Deno.Command("git", {
		cwd: repoPath,
		args: ["cat-file", "-t", gitRef],
	}).output();
	if (!catOutput.success) {
		console.log('📦 Fetching git registry', name, gitRef);

		const fetchOutput = await new Deno.Command("git", {
			cwd: repoPath,
			args: ["fetch", "origin", gitRef],
		}).output();
		if (!fetchOutput.success) {
			throw new Error(
				`Failed to fetch registry ${name} at ${gitRef}:\n${
					new TextDecoder().decode(fetchOutput.stderr)
				}`,
			);
		}
	}

	// Checkout commit
	const checkoutOutput = await new Deno.Command("git", {
		cwd: repoPath,
		args: ["checkout", gitRef],
	}).output();
	if (!checkoutOutput.success) {
		throw new Error(
			`Failed to checkout registry ${name} at ${gitRef}:\n${
				new TextDecoder().decode(checkoutOutput.stderr)
			}`,
		);
	}

	// Join sub directory
	const path = resolve(repoPath, config.directory ?? "");
	if (!await exists(path)) {
		throw new Error(`Registry not found at ${path}`);
	}

	return path;
}

function resolveGitRef(registryConfig: RegistryConfigGit): string {
	if ('rev' in registryConfig) {
		return registryConfig.rev;
	} else if ('branch' in registryConfig) {
		return registryConfig.branch;
	} else if ('tag' in registryConfig) {
		return `tags/${registryConfig.tag}`;
	} else {
		throw new Error("Unreachable");
	}
}