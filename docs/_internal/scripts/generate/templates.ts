import { resolve } from "@std/path"
import { TEMPLATES_ROOT } from "./paths.ts"

export async function readTemplate(name: string) {
  return await Deno.readTextFile(resolve(TEMPLATES_ROOT, `${name}.mdx`))
}
