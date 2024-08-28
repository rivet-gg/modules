// deno task artifacts:build:editor

import { resolve } from "@std/path";
import { buildArtifacts, projectRoot } from "./util.ts";

const EDITOR_PATH = resolve(import.meta.dirname!, "..", "..", "editor");

await new Deno.Command("yarn", {
    cwd: EDITOR_PATH,
    env: {
        "NODE_ENV": "production",
    },
    stdout: "inherit",
    stderr: "inherit",
}).output();

await new Deno.Command("yarn", {
    args: [
        "build",
    ],
    cwd: EDITOR_PATH,
    env: {
        "NODE_ENV": "production",
        "TURBO_UI": "0",
        "VITE_OUT_DIR": resolve(import.meta.dirname!, "..", "..", "artifacts", "editor"),
    },
    stdout: "inherit",
    stderr: "inherit",
}).output();

await buildArtifacts({
    rootPath: projectRoot(),
    patterns: [
        "artifacts/editor/**/*",
    ],
    outputPath: resolve(projectRoot(), "artifacts", "editor_archive.json"),
    encode: "base64",
});
