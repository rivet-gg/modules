import { useMutation, useQueryClient } from "@tanstack/react-query";
import ky from "ky";
import { metaQueryOptions, stateQueryOptions } from "./queries";
import type { ProjectConfig } from "../lib/types";

export function useConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    throwOnError: true,
    mutationFn: async (json: ProjectConfig) => {
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
