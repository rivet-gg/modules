export interface ModuleConfig extends Record<string, unknown> {
	status?: "preview" | "beta" | "stable" | "deprecated";
	description?: string;

	/**
	 * The GitHub handle of the authors of the module.
	 */
	authors?: string[];

	scripts: { [name: string]: ScriptConfig };
	errors: { [name: string]: ErrorConfig };
}

export interface ScriptConfig {
	/**
	 * If the script can be called from the public HTTP interface.
	 *
	 * If enabled, ensure that authentication & rate limits are configued for
	 * this endpoints. See the `user` and `rate_limit` modules.
	 *
	 * @default false
	 */
	public?: boolean;
}

export interface ErrorConfig {
	description?: string;
}
