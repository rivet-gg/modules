import { pascalify } from "../../types/case_conversions.ts";
import { dirname, glob, resolve } from "../../deps.ts";
import { GeneratedCodeBuilder, Lang } from "../../build/gen/code_builder.ts";
import { Module, Project } from "../../project/mod.ts";
import dynamicArchive from "../../../artifacts/dynamic_archive.json" with { type: "json" };
import { dedent } from "../../build/deps.ts";
import { autoGenHeader } from "../../build/misc.ts";

// https://docs.godotengine.org/en/stable/classes/class_object.html#class-object
const RESERVED_WORDS = [
	"_get",
	"_get_property_list",
	"_init",
	"_notification",
	"_property_can_revert",
	"_property_get_revert",
	"_set",
	"_to_string",
	"_validate_property",
	"add_user_signal",
	"call",
	"call_deferred",
	"callv",
	"can_translate_messages",
	"cancel_free",
	"connect",
	"disconnect",
	"emit_signal",
	"free",
	"get",
	"get_class",
	"get_incoming_connections",
	"get_indexed",
	"get_instance_id",
	"get_meta",
	"get_meta_list",
	"get_method_list",
	"get_property_list",
	"get_script",
	"get_signal_connection_list",
	"get_signal_list",
	"has_meta",
	"has_method",
	"has_signal",
	"has_user_signal",
	"is_blocking_signals",
	"is_class",
	"is_connected",
	"is_queued_for_deletion",
	"notification",
	"notify_property_list_changed",
	"property_can_revert",
	"property_get_revert",
	"remove_meta",
	"set",
	"set_block_signals",
	"set_deferred",
	"set_indexed",
	"set_message_translation",
	"set_meta",
	"set_script",
	"to_string",
	"tr",
	"tr_n",
];

export async function generateGodot(project: Project, sdkGenPath: string) {
	await copyBase(sdkGenPath);
	await generateBackendAndModules(project, sdkGenPath);
	await generateModuleAddons(project, sdkGenPath);
}

export async function copyBase(sdkGenPath: string) {
	for (const key in dynamicArchive) {
		if (!key.startsWith("sdk/godot/")) continue;

		// "sdk/godot/".length = 10
		const path = resolve(sdkGenPath, key.slice(10));

		// Create dir for module apis
		try {
			await Deno.mkdir(dirname(path), { recursive: true });
		} catch (e) {
			if (!(e instanceof Deno.errors.AlreadyExists)) {
				throw e;
			}
		}

		const content = autoGenHeader("#") + "\n\n" + (dynamicArchive as Record<string, string>)[key];
		await Deno.writeTextFile(path, content);
	}

	// Create dirs for apis
	try {
		await Deno.mkdir(resolve(sdkGenPath, "modules"), { recursive: true });
	} catch (e) {
		if (!(e instanceof Deno.errors.AlreadyExists)) {
			throw e;
		}
	}
}

export async function generateBackendAndModules(project: Project, sdkGenPath: string) {
	const apiBuilder = new GeneratedCodeBuilder(resolve(sdkGenPath, "backend.gd"), 2, Lang.GDScript);

	apiBuilder.append`
		extends Node
		class_name BackendSingleton
		# API for interacting with the backend.

		const _Client = preload("client/client.gd")
		const _Configuration = preload("client/configuration.gd")

		## Client used to connect o the backend.
		var client: _Client

		## Configuration for how to connect to the backend.
		var configuration: _Configuration

		func _init():
			self.configuration = _Configuration.new()

			self.client = _Client.new(self.configuration)
			self.add_child(self.client)

			self._init_modules()
	`;

	const imports = apiBuilder.chunk;
	const properties = apiBuilder.chunk;
	const modules = apiBuilder.chunk;

	for (const mod of project.modules.values()) {
		const moduleNamePascal = pascalify(mod.name);
		const className = `Backend${moduleNamePascal}`;

		// Create module api class
		const moduleApiBuilder = new GeneratedCodeBuilder(
			resolve(sdkGenPath, "modules", `${mod.name}.gd`),
			2,
			Lang.GDScript,
		);

		// Add module docs
		let moduleDocs = "";
		if (mod.config.name) {
			moduleDocs += mod.config.name;
			if (mod.config.description) {
				moduleDocs += "\n\n" + mod.config.description;
			}
		} else {
			moduleDocs += moduleNamePascal;
		}
		moduleDocs = moduleDocs.split("\n").map((x) => `## ${x}`).join("\n");

		moduleApiBuilder.append`
			class_name ${className}
			${moduleDocs}
		`;

		moduleApiBuilder.append`
			const _ApiResponse := preload("../client/response.gd")

			var _client: BackendClient

			func _init(client: BackendClient):
				self._client = client
		`;

		const scripts = moduleApiBuilder.chunk;
		const scriptNames = Array.from(mod.scripts.keys());
		const escapedScriptNames = escapeReservedWords(scriptNames);

		for (const [i, scriptName] of scriptNames.entries()) {
			const escapedScriptName = escapedScriptNames[i];
			const script = mod.scripts.get(scriptName)!;

			if (!script.config.public) continue;

			const path = `/modules/${mod.name}/scripts/${script.name}/call`;

			// Add script docs
			let scriptDocs = "";
			if (script.config.name) {
				scriptDocs += script.config.name;
				if (script.config.description) {
					scriptDocs += "\n\n" + script.config.description;
				}
			} else {
				scriptDocs += scriptName;
			}
			scriptDocs = scriptDocs.split("\n").map((x) => `## ${x}`).join("\n");

			scripts.append`
				${scriptDocs}
				func ${escapedScriptName}(body: Dictionary = {}) -> BackendRequest:
					return self._client.build_request(HTTPClient.METHOD_POST, "${path}", body)
			`;
		}
		await moduleApiBuilder.write();

		// Add module to main api class
		imports.append`const _${className} := preload("modules/${mod.name}.gd")`;
		properties.append`var ${mod.name}: _${className}`;
		// TODO: Make prettier (needs tab alignment with the below `func _init` block)
		modules.appendRaw(
			`\tself.${mod.name} = _${className}.new(self.client)`,
		);
	}

	// TODO: Refactor to not be Rivet-specific
	GeneratedCodeBuilder.wrap(
		dedent`
			func _init_modules():
		`,
		modules,
		"",
	);

	await apiBuilder.write();
}

function escapeReservedWords(wordsList: string[]) {
	const escaped = [];
	const usedNames = new Set();

	for (let [i, word] of wordsList.entries()) {
		while (RESERVED_WORDS.includes(word) || usedNames.has(word)) {
			word = "call_" + word;
		}

		usedNames.add(word);
		escaped[i] = word;
	}

	return escaped;
}

export async function generateModuleAddons(project: Project, sdkGenPath: string) {
	for (const module of project.modules.values()) {
		const sdkAddonsPath = resolve(module.path, "sdk_addons", "godot");
		const files = await glob.glob("**/*.gd", { cwd: sdkAddonsPath });
		for (const file of files) {
			const bodyRaw = await Deno.readTextFile(resolve(sdkAddonsPath, file));
			const body = autoGenHeader("#") + "\n\n" + bodyRaw;
			await Deno.writeTextFile(resolve(sdkGenPath, file), body);
		}
	}
}
