import type { Meta, Project } from "@rivet-gg/opengb-shared-internals";
import { queryOptions } from "@tanstack/react-query";
import ky from "ky";

export type ValidationError = {
  name: "ValidationError";
  info: Record<string, string>;
};
type Error = { name: "CombinedError"; errors: Error[] } | ValidationError;

export const metaQueryOptions = () =>
  queryOptions({
    queryKey: ["meta"],
    retry: 2,
    queryFn: async () => {
      const response = await ky.get("/__internal/meta.json", {
        timeout: 10000,
      });
      return response.json() as Promise<Meta>;
    },
    throwOnError: true,
    select: (data) => {
      const modules = Object.entries(data.modules);
      return {
        ...data,
        modules: Object.fromEntries(
          modules.map(([slug, module]) => {
            const isDuplicate =
              modules.filter(([_, m]) => m.config.name === module.config.name)
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
      const response = await ky.get("/__internal/state", {
        timeout: 1000,
      });
      return response.json() as Promise<{
        value: "failure" | "success" | "building";
        error?: Error;
        project: Project;
      }>;
    },
  });

export const configQueryOptions = () =>
  queryOptions({
    ...stateQueryOptions(),
    refetchInterval: undefined,
    select: (data) => data.project.config,
  });
