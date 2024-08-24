import { Command, CompletionsCommand, HelpCommand, ValidationError } from "./deps.ts";
import { colors } from "../../toolchain/src/term/deps.ts";
import { devCommand } from "./commands/dev.ts";
import { moduleCommand } from "./commands/module.ts";
import { buildCommand } from "./commands/build.ts";
import { dbCommand } from "./commands/db/mod.ts";
import { testCommand } from "./commands/test.ts";
import { sdkCommand } from "./commands/sdk.ts";
import { createCommand } from "./commands/create.ts";
import { lintCommand } from "./commands/lint.ts";
import { formatCommand } from "./commands/format.ts";
import { initCommand } from "./commands/init.ts";
import { cleanCommand } from "./commands/clean.ts";
import { printError } from "../../toolchain/src/error/mod.ts";
import { runShutdown } from "../../toolchain/src/utils/shutdown_handler.ts";
import { info } from "../../toolchain/src/term/status.ts";
import { configCommand } from "./commands/config.ts";
import { VERSION } from "./version.ts";

// Add explicit shutdown handler in order to:
// - Safely run `runShutdown`
// - Exit correctly when running inside of Docker (Deno doesn't handle the signal correctly)
Deno.addSignalListener("SIGINT", async () => {
	info("Shutting down...");
	await runShutdown();
	Deno.exit(1);
});

// Run command
const command = new Command();
command.action(() => command.showHelp())
	.name("opengb")
	.version(VERSION)
	.description("Open Game Backend CLI")
	.globalOption("-p, --project <path>", "Path to project root or project config")
	.throwErrors()
	.command("init", initCommand)
	.command("dev", devCommand)
	.command("module", moduleCommand)
	.command("create", createCommand)
	.command("test", testCommand)
	.command("database, db", dbCommand)
	.command("sdk", sdkCommand)
	.command("format, fmt", formatCommand)
	.command("lint", lintCommand)
	// HACK: `as any` prevents infinite recursion TypeScript bug
	.command("build", buildCommand as any)
	.command("clean", cleanCommand)
	.command("config", configCommand)
	.command("help", new HelpCommand().global())
	.command("completions", new CompletionsCommand());

// Run command
let exitCode = 0;
try {
	await command.parse();
} catch (err) {
	if (err instanceof ValidationError && err.cmd) {
		// Print Cliffy help
		err.cmd.showHelp();
		console.error(colors.red(`  ${colors.bold("error")}: ${err.message}\n`));

		exitCode = err.exitCode;
	} else {
		// Print error
		printError(err);
		exitCode = 1;
	}
} finally {
	await runShutdown();
}

Deno.exit(exitCode);
