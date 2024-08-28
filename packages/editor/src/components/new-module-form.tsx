import {
  createSchemaForm,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  JavaScriptCode,
  Label,
} from "@rivet-gg/components";
import { Casing, regexes } from "../../../../packages/toolchain/types/identifiers/defs";
import { z } from "zod";
import { ModulesSelect } from "./modules-select";

export const { useContext, Form, Submit, SetValue } = createSchemaForm(
  z.object({
    // TODO: Move to shared internals
    name: z
      .string()
      .min(1)
      .max(32)
      .regex(regexes[Casing.Snake], "Must be snake_case")
      .optional(),
    module: z.string(),
  }),
);

export const Name = () => {
  const { control, watch } = useContext();

  const module = watch("module");

  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder={module} />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export const Modules = () => {
  const { control } = useContext();
  return (
    <FormField
      control={control}
      name="module"
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>Module</FormLabel>
            <FormControl>
              <ModulesSelect
                onValueChange={field.onChange}
                value={field.value}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export const UsagePreview = () => {
  const { watch } = useContext();
  const name = watch("name", "module_name");
  const module = watch("module", "module_name");
  return (
    <>
      <Label>Exmaple call</Label>
      <JavaScriptCode
        readOnly
        editable={false}
        value={`await ctx.modules.${(name || module).slice(0, 32)}.scriptName(\n\t/* script args */\n)`}
      />
    </>
  );
};
