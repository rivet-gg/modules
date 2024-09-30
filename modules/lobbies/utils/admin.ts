import { RuntimeError } from "../module.gen.ts";

export function adminGuard(ctx: any, inputToken: string) {
  const adminToken = ctx.environment.get("ADMIN_TOKEN");
  if (!adminToken) throw new RuntimeError("forbidden");
  if (inputToken != adminToken) throw new RuntimeError("forbidden");
}
