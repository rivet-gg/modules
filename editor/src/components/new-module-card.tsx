import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toast,
} from "@rivet-gg/components";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useContext } from "react";
import { useDialog } from "../hooks/use-dialog";
import { addModule } from "../lib/add-module";
import { metaQueryOptions, useConfigMutation } from "../queries";
import { ModuleSearchContext } from "./module-search-context";
import { ModulesSelect } from "./modules-select";

export function NewModuleCard() {
  const { dialog, add } = useAddModule();
  const ref = useContext(ModuleSearchContext);

  return (
    <>
      {dialog}
      <Card w="full" className=" bg-background-main">
        <CardHeader>
          <CardTitle>Add Module</CardTitle>
          <CardDescription>
            Add a new module to your backend project. Modules are reusable
            pieces of functionality that can be called from your scripts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModulesSelect
            ref={ref}
            placeholder="Search for a module..."
            onValueChange={add}
            value={""}
          />
        </CardContent>
      </Card>
    </>
  );
}

const useAddModule = () => {
  const queryClient = useQueryClient();
  const { mutateAsync } = useConfigMutation();
  const { dialog, open } = useDialog.NewModule({});

  const add = useCallback(
    async ({ name, registry }: { registry: string; name: string }) => {
      const meta = await queryClient.fetchQuery(metaQueryOptions());

      if (meta.config.modules[name]) {
        open({ module: { name, registry } });
        return;
      }

      const config = { ...meta.config };
      addModule(meta, config, { registry, name });

      await toast.promise(() => mutateAsync(config), {
        loading: "Adding module...",
        success: "Module added",
        error: "Failed to add module",
      });
    },
    [queryClient, mutateAsync, open],
  );

  return { dialog, add };
};
