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

const command = new Command();
command.action(() => command.showHelp())
	.globalOption("-p, --path <path>", "Path to project root")
	.command("start", startCommand)
	.command("test", testCommand)
	.command("db", dbCommand)
	.command("build", buildCommand)
	.command("lint", lintCommand)
	.command("format, fmt", formatCommand)
	.command("sdk", sdkCommand)
	.command("create", createCommand)
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
