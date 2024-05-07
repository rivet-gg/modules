import { resolve } from "../deps.ts";
import { z } from "../build/schema/deps.ts";
import { ValidationError } from "../error/mod.ts";

const RegistryGitUrlConfigSchema = z.union([z.string(), z.object({ https: z.string(), ssh: z.string() })]).describe(
	"The URL to the git repository. If both HTTPS and SSH URL are provided, they will both be tried and use the one that works",
);

const RegistryGitCommonConfigSchema = z.object({
	url: RegistryGitUrlConfigSchema,
	directory: z.string().optional(),
});

const RegistryLocalConfigSchema = z.object({
	local: z.object({
		directory: z.string(),
		isExternal: z.boolean().optional().describe(
			"If true, this will be treated like an external registry. This is important if multiple projects are using the same registry locally. Modules from this directory will not be tested, formatted, linted, and generate Prisma migrations.",
		),
	}),
});

const RegistryGitConfigSchema = z.object({
	git: z.union([
		RegistryGitCommonConfigSchema.merge(z.object({ branch: z.string() })),
		RegistryGitCommonConfigSchema.merge(z.object({ tag: z.string() })),
		RegistryGitCommonConfigSchema.merge(z.object({ rev: z.string() })),
	]),
});

const RegistryConfigSchema = z.union([
	RegistryLocalConfigSchema,
	RegistryGitConfigSchema,
]);

const CorsConfigSchema = z.object({
	origins: z.array(z.string()).describe("The origins that are allowed to make requests to the server."),
});

const RuntimeConfigSchema = z.object({
	cors: CorsConfigSchema.optional(),
});

const ProjectRouteConfigSchema = z.object({
	pathPrefix: z.string().optional().describe("The path prefix for all routes in this module."),
});

const ProjectModuleConfigSchema = z.object({
	registry: z.string().optional().describe("The name of the registry to fetch the module from."),
	module: z.string().optional().describe("Overrides the name of the module to fetch inside the registry."),
	config: z.record(z.any()).optional().describe(
		"The config that configures how this module is ran at runtime.",
	),
	storageAlias: z.string().optional().describe(
		"Used to store data in a consistent location in case the module name changes. This is used to construct the Postgres database schema and actor identifiers. Changing this will effectively unlink all data stored in this module. Changing it back to the old value will restore the data.",
	),
	routes: ProjectRouteConfigSchema.optional().describe(
		"Config options controlling how the routes are implemented and accessed.",
	),
});

export const ProjectConfigSchema = z.object({
	registries: z.record(RegistryConfigSchema),
	modules: z.record(ProjectModuleConfigSchema),
	runtime: RuntimeConfigSchema.optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;

export type RegistryConfigLocal = z.infer<typeof RegistryLocalConfigSchema>["local"];

export type RegistryConfigGit = z.infer<typeof RegistryGitConfigSchema>["git"];

export type RegistryConfigGitUrl = z.infer<typeof RegistryGitUrlConfigSchema>;

export type ProjectModuleConfig = z.infer<typeof ProjectModuleConfigSchema>;

export type ProjectRouteConfig = z.infer<typeof ProjectRouteConfigSchema>;

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

export type CorsConfig = z.infer<typeof CorsConfigSchema>;

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
	// Read config
	const projectConfigPath = configPath(projectPath);
	const configRaw = await Deno.readTextFile(projectConfigPath);
	const config = JSON.parse(configRaw);

	// Validate config
	const result = await ProjectConfigSchema.safeParseAsync(config);
	if (!result.success) {
		throw new ValidationError(`Invalid project configuration.`, {
			validationError: result.error,
			path: configPath(projectPath),
		});
	}

	return result.data;
}

export function configPath(root: string): string {
	return resolve(root, "backend.json");
}
