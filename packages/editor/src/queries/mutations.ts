import type { Project } from "@rivet-gg/opengb-shared-internals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import { metaQueryOptions, stateQueryOptions } from "./queries";

export function useConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    throwOnError: true,
    mutationFn: async (json: Project) => {
      await ky.patch("/__internal/config", {
        json,
        timeout: 10000,
      });
    },
    onSuccess: async () => {
      await queryClient.refetchQueries(metaQueryOptions());
      await queryClient.invalidateQueries(stateQueryOptions());
    },
  });
}
