import { queryOptions } from "@tanstack/react-query";
import { hc } from "hono/client";
import type { InternalApi } from "../../../packages/toolchain/internal-api/router";
import ky from "ky";

const client = hc<InternalApi>("/__internal", {
  fetch: (input: string, init: RequestInit | undefined) => ky<Response>(input, { ...init, timeout: 10000 }),
});

export const metaQueryOptions = () =>
  queryOptions({
    queryKey: ["meta"],
    retry: 2,
    queryFn: async () => {
      const response = await client["meta.json"].$get();
      if (!response.ok) {
        throw new Error("Internal server error");
      }
      return response.json();
    },
    throwOnError: true,
    select: (data) => {
      const modules = Object.entries(data.modules);
      return {
        ...data,
        modules: Object.fromEntries(
          modules.map(([slug, module]) => {
            const isDuplicate = modules.filter(([_, m]) => m.config.name === module.config.name)
              .length > 1;
            const moduleName = module.config.name || module.namePascal;
            return [
              slug,
              {
                ...module,
                config: {
                  ...module.config,
                  name: isDuplicate ? `${moduleName} (${slug})` : moduleName,
                },
              },
            ];
          }),
        ),
      };
    },
  });

export const registriesQueryOptions = () =>
  queryOptions({
    ...metaQueryOptions(),
    select: (data) => data.registries,
  });

export const moduleQueryOptions = (slug: string) =>
  queryOptions({
    ...metaQueryOptions(),
    queryKey: ["module", slug],
    select: (data) =>
      Object.values(data.registries).find((registry) => registry.modules[slug])
        ?.modules[slug],
  });

export const stateQueryOptions = () =>
  queryOptions({
    refetchInterval: 2000,
    queryKey: ["state"],
    queryFn: async () => {
      const response = await client.state.$get();
      if (!response.ok) {
        throw new Error("Internal server error");
      }
      return response.json();
    },
  });

export const configQueryOptions = () =>
  queryOptions({
    ...stateQueryOptions(),
    refetchInterval: undefined,
    select: (data) => data.config,
  });
