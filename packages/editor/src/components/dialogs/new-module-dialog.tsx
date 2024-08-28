import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Code,
  type DialogContentProps,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Flex,
} from "@rivet-gg/components";
import { addModule } from "../../lib/add-module";
import { metaQueryOptions, useConfigMutation } from "../../queries";
import { queryClient } from "../../queries/global";
import * as NewModuleForm from "../new-module-form";

interface NewModuleDialogProps extends DialogContentProps {
  module: { name: string; registry: string };
}

export default function NewModuleDialog({
  module,
  onClose,
}: NewModuleDialogProps) {
  const { mutateAsync } = useConfigMutation();

  return (
    <NewModuleForm.Form
      onSubmit={async (values, form) => {
        const slug = values.name || module.name;
        const meta = await queryClient.fetchQuery(metaQueryOptions());
        if (meta.config.modules[slug]) {
          return form.setError("name", {
            message: "Module with this name already exists",
          });
        }

        const config = { ...meta.config };
        addModule(meta, config, {
          ...module,
          alias: values.name !== module.name ? values.name : undefined,
        });

        await mutateAsync(config);

        onClose?.();
      }}
      defaultValues={{
        name: "",
        module: [module.registry, module.name].join("."),
      }}
    >
      <DialogHeader>
        <DialogTitle>Add module</DialogTitle>
        <DialogDescription>
          Choose a name (in <Code>snake_case</Code>) under which new module will
          be available in your backend project.
        </DialogDescription>
      </DialogHeader>
      <Flex gap="4" direction="col">
        <NewModuleForm.SetValue name="name" value={module.name} />
        <NewModuleForm.Modules />
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Advanced</AccordionTrigger>
            <AccordionContent>
              <Flex gap="4" direction="col" px="2">
                <NewModuleForm.Name />
                <NewModuleForm.UsagePreview />
              </Flex>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Flex>
      <DialogFooter>
        <NewModuleForm.Submit type="submit">Add</NewModuleForm.Submit>
      </DialogFooter>
    </NewModuleForm.Form>
  );
}
