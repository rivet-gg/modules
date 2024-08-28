import { abortable } from "@std/async";
import { dirname, resolve, SEPARATOR } from "@std/path";
import { Project } from "../project/mod.ts";
import { loadProject, loadProjectConfigPath, LoadProjectOpts } from "../project/project.ts";
import { info, verbose } from "../term/status.ts";
import { AbortError, InternalError } from "../error/mod.ts";
import { printError } from "../error/mod.ts";
import * as colors from "@std/fmt/colors";

export interface WatchOpts {
	/**
	 * Options to pass to `loadProject`.
	 */
	loadProjectOpts: LoadProjectOpts;

	/**
	 * If true, don't watch for changes and just runs `fn` once.
	 *
	 * This is useful for keeping logic simple where watching needs to be
	 * disabled.
	 */
	disableWatch?: boolean;

	/**
	 * Called when an error occurs during the watch loop.
	 */
	onError?: (error: unknown) => void;

	/**
	 * Called when a file changes.
	 */
	onFileChange?: () => void;

	/**
	 * Called when the project changes.
	 */
	onProjectChange?: (project: Project) => void;

	fn: (project: Project, signal: AbortSignal) => Promise<void>;
}

export async function watch(opts: WatchOpts) {
	// TODO: debounce
	// TODO: catch errors

	// Run without watching
	if (opts.disableWatch) {
		const signal = new AbortController().signal;
		const project = await loadProject(opts.loadProjectOpts, signal);
		await opts.fn(project, signal);
		return;
	}

	// Attempt to load project before starting watch loop.
	//
	// If this fails, we'll watch for the backend.json file and try loading the
	// project again.
	let project: Project | undefined = undefined;
	try {
		project = await loadProject(opts.loadProjectOpts);
		opts.onProjectChange?.(project);
	} catch (err) {
		opts?.onError?.(err);
		printError(err);
	}

	// Start watch loop
	while (true) {
		// Show warning if TTY not enabled
		if (Deno.build.os == "linux" || Deno.build.os == "darwin") {
			try {
				const sttyOutput = await new Deno.Command("stty", {
					args: ["sane"],
					stdin: "inherit",
					stdout: "inherit",
					stderr: "inherit",
				}).output();
				if (!sttyOutput.success) {
					console.warn("Failed to run `stty sane`. This may cause terminal issues.");
				}
			} catch (error: unknown) {
				console.warn(`Failed to run \`stty\` command: ${error}`);
			}
		}

		// Try to print horizontal line if has TTY
		try {
			const { columns } = Deno.consoleSize();
			console.log(`\n${colors.dim("─".repeat(columns))}\n`);
		} catch (_) {
			console.log(`\n${colors.dim("─".repeat(8))}\n`);
		}

		// Run action in background	in an abortable way
		let fnAbortController: AbortController | undefined;
		if (project != undefined) {
			fnAbortController = new AbortController();
			abortable(
				wrapWatchFn(project, opts, fnAbortController.signal),
				fnAbortController.signal,
			)
				.catch((err) => {
          // Ignore abort error
					if (err instanceof AbortError) return;

          // Re-throw error
          throw err;
				});
		}

		// Wait for change that we care about
		let foundEvent = false;
		const watchPaths = getWatchPaths(opts.loadProjectOpts, project);
		const watcher = Deno.watchFs(watchPaths);
		verbose("Watching", watchPaths.join(", "));
		for await (const event of watcher) {
			const relevantPaths = event.paths.filter(shouldPathTriggerRebuild);
			if (relevantPaths.length > 0) {
				foundEvent = true;
				info(
					"Change detected",
					`${event.kind}: ${relevantPaths.join(", ")}`,
				);
				break;
			}
		}
		if (!foundEvent) {
			throw new InternalError("Unreachable: watchFs iterator ended");
		}

		// Abort previous build. Ignore if it's already aborted.
		try {
			fnAbortController?.abort(new AbortError("Rebuilding project due to file change."));
			opts.onFileChange?.();
		} catch (err) {
			if (err instanceof Error && err.name != "AbortError") throw err;
		}

		// Try to reload project
		//
		// If this fails, it means the project is in a bad state. This will skip the next
		// action and wait for the next change.
		try {
			project = await loadProject(opts.loadProjectOpts);
			opts.onProjectChange?.(project);
		} catch (err) {
			printError(err);
			opts?.onError?.(err);
			project = undefined;
		}
	}
}

async function wrapWatchFn(
	project: Project,
	opts: WatchOpts,
	signal: AbortSignal,
) {
	// Gracefully handle errors
	try {
		await opts.fn(project, signal);
	} catch (err) {
		opts?.onError?.(err);
		printError(err);
	}
}

function getWatchPaths(loadProjectOpts: LoadProjectOpts, project?: Project) {
	if (project) {
		const paths: string[] = [
			resolve(project.path, "backend.json"),
		];
		if (project) {
			for (const module of project.modules.values()) {
				if (
					!("local" in module.registry.config) ||
					module.registry.config.local.isExternal
				) continue;
				paths.push(module.path);
			}
		}
		return paths;
	} else {
		// Wait the entire directory to check for backend config
		return [dirname(loadProjectConfigPath(loadProjectOpts))];
	}
}

function shouldPathTriggerRebuild(path: string) {
	const pathSplit = path.split(SEPARATOR);

	// Ignore generated files
	if (pathSplit.includes(".opengb")) return false;
	if (pathSplit[pathSplit.length - 1]?.endsWith(".gen.ts")) return false;

	// Ignore database migrations generated as a side effect
	const dbIdx = pathSplit.indexOf("db");
	if (dbIdx != -1 && pathSplit[dbIdx + 1] == "migrations") return false;

	return true;
}
