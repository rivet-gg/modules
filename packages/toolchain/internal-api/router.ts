import { Hono, type MiddlewareHandler } from "@hono/hono";
import { createFactory } from "@hono/hono/factory";
import { serveStatic as baseServeStatic, type ServeStaticOptions } from "@hono/hono/serve-static";
import { validator } from "@hono/hono/validator";
import { resolve } from "@std/path";
import { decodeBase64 } from "@std/encoding";
import editorArchive from "../../../artifacts/editor_archive.json" with { type: "json" };
import { InternalState } from "./state.ts";
import { progress } from "../term/status.ts";
import { metaPath } from "../project/mod.ts";
import { ProjectMeta } from "../build/meta.ts";
import { ProjectConfigSchema } from "../config/project.ts";

interface Env {
	Variables: {
		state: InternalState;
	};
}

export const internalApi = new Hono<Env>()
	.get("/state", (c) => {
		const state = c.get("state").get();
		if (state.value === "idle") {
			return c.json({ error: "No project loaded" }, 400);
		}
		if (state.value === "failure") {
			return c.json({ value: state.value, config: state.project.config, error: state.error });
		}
		return c.json({ value: state.value, config: state.project.config });
	})
	.get("/project.json", (c) => {
		const state = c.get("state").get();
		if (state.value === "idle") {
			return c.json({ error: "No project loaded" }, 400);
		}

		const project = state.project;
		return c.json(project);
	})
	.get("/meta.json", async (c) => {
		const state = c.get("state").get();
		if (state.value === "idle") {
			return c.json({ error: "No project loaded" }, 400);
		}

		const output = await Deno.readTextFile(metaPath(state.project));
		return c.json<ProjectMeta>(JSON.parse(output), 200);
	})
	.patch(
		"/config",
		validator("json", (value, c) => {
			const result = ProjectConfigSchema.omit({ registries: true, runtime: true }).safeParse(value);
			if (!result.success) {
				return c.json({ error: "Invalid body" }, 400);
			}
			return result.data;
		}),
		async (c) => {
			const state = c.get("state").get();
			if (state.value === "idle") {
				return c.json({ error: "No project loaded" }, 400);
			}

			const existingConfig = await Deno.readTextFile(
				resolve(state.project.path, "backend.json"),
			);
			await Deno.writeTextFile(
				resolve(state.project.path, "backend.json"),
				JSON.stringify({ ...JSON.parse(existingConfig), modules: c.req.valid("json").modules }, null, "\t"),
			);

			await new Promise<void>((resolve) => {
				const unsubscribe = c.get("state").on("changed", (state) => {
					if (state.value === "success" || state.value === "failure") {
						unsubscribe();
						resolve();
					}
				});
			});

			return c.body(null, 204);
		},
	);

export type InternalApi = typeof internalApi;

// copied and modified from `@hono/hono/deno -> serveStatic.ts`
const serveStaticEditorArtifacts = <E extends Env = Env>(
	options: ServeStaticOptions<E>,
): MiddlewareHandler => {
	return async function serveStatic(c, next) {
		const getContent = async (path: string) => {
			const archiveKey = `artifacts/editor/${path}`;
			try {
				const file = (editorArchive as Record<string, string>)[archiveKey];
				return file ? decodeBase64(file) : null;
			} catch (e) {
				console.warn(`${e}`);
			}
			return null;
		};
		const pathResolve = (path: string) => path;
		return baseServeStatic({
			...options,
			getContent,
			pathResolve,
		})(c, next);
	};
};

export function createProjectInternalApiRouter(internalState: InternalState) {
	const factory = createFactory<Env>({
		initApp: (app) => {
			app.use(async (c, next) => {
				c.set("state", internalState);
				await next();
			});
		},
	});

	const app = factory.createApp();

	app.route("/__internal", internalApi);
	app.get(
		"/*",
		serveStaticEditorArtifacts({ root: "/" }),
	);

	return app;
}

export function createAndStartProjectInternalApiRouter(internalState: InternalState) {
	const app = createProjectInternalApiRouter(internalState);

	const hostname = Deno.env.get("OPENGB_EDITOR_HOST") ?? "127.0.0.1";
	const port = parseInt(Deno.env.get("OPENGB_EDITOR_PORT") ?? "6421");
	Deno.serve({
		hostname,
		port,
		handler: app.fetch,
		onListen: () => {
			progress("OpenGB Editor started", `http://${hostname}:${port}`);
		},
	});

	return app;
}
