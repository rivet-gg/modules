import { createDataDialogHook } from "@rivet-gg/components";

export function useDialog() {}

useDialog.NewModule = createDataDialogHook(
  ["module"],
  import("../components/dialogs/new-module-dialog"),
);
