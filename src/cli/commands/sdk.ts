import { Command } from "../deps.ts";
import { GlobalOpts, initProject } from "../common.ts";
import { generateSdk } from "../../sdk/generate.ts";
import { UnreachableError } from "../../error/mod.ts";
import { SdkTarget } from "../../sdk/generate.ts";
import { build, DbDriver, Format, Runtime } from "../../build/mod.ts";
import { EnumType } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

const targetType = new EnumType(["typescript", "unity", "godot"]);

export const sdkCommand = new Command<GlobalOpts>()
	.description("SDK commands");

sdkCommand.action(() => sdkCommand.showHelp());

sdkCommand
	.command("generate")
	.type("target", targetType)
	.arguments("<target:target>")
	.option("-o, --output <path:string>", "SDK output path", { default: "./sdk" })
	.action(async (opts, target) => {
		let targetSdk: SdkTarget;
		switch (target) {
			case "typescript":
				targetSdk = SdkTarget.TypeScript;
				break;
			case "unity":
				targetSdk = SdkTarget.Unity;
				break;
			case "godot":
				targetSdk = SdkTarget.Godot;
				break;
			default:
				throw new UnreachableError(target);
		}

		const project = await initProject(opts);

		// Build with schemas
		await build(project, {
			runtime: Runtime.Deno,
			format: Format.Native,
			dbDriver: DbDriver.NodePostgres,
			strictSchemas: true,
			skipDenoCheck: true,
		});

		// Generate SDK
		await generateSdk(project, targetSdk, opts.output);
	});
