import {
	Command,
	CompletionsCommand,
	HelpCommand,
	ValidationError,
} from "./deps.ts";
import { startCommand } from "./commands/start.ts";
import { buildCommand } from "./commands/build.ts";
import { dbCommand } from "./commands/db.ts";
import { testCommand } from "./commands/test.ts";
import { sdkCommand } from "./commands/sdk.ts";
import { createCommand } from "./commands/create.ts";
import { lintCommand } from "./commands/lint.ts";
import { formatCommand } from "./commands/format.ts";
import { initCommand } from "./commands/init.ts";
import { cleanCommand } from "./commands/clean.ts";

const command = new Command();
command.action(() => command.showHelp())
	.globalOption("-p, --path <path>", "Path to project root")
	.command("init", initCommand)
	.command("create", createCommand)
	.command("start", startCommand)
	.command("test", testCommand)
	.command("database, db", dbCommand)
	.command("sdk", sdkCommand)
	.command("format, fmt", formatCommand)
	.command("lint", lintCommand)
	.command("build", buildCommand)
	.command("clean", cleanCommand)
	.command("help", new HelpCommand().global())
	.command("completions", new CompletionsCommand())
	.error((error, cmd) => {
		if (error instanceof ValidationError) {
			cmd.showHelp();
		} else {
			console.error(error);
		}
		Deno.exit(error instanceof ValidationError ? error.exitCode : 1);
	})
	.parse(Deno.args);
