import { Command } from "../deps.ts";
import { GlobalOpts } from "../common.ts";
import { ensurePrismaInstalled } from "../../migrate/prisma.ts";

export const internalCommand = new Command<GlobalOpts>()
	.hidden()
	.description("Internal commands");

internalCommand.action(() => internalCommand.showHelp());

internalCommand
	.command("prewarm-prisma")
	.action(async () => {
		await ensurePrismaInstalled();
	});
