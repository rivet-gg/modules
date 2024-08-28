import { createSchemaForm } from "@rivet-gg/components";
import { type ReactNode, useMemo } from "react";
import { z, type ZodString } from "zod";
import { convertSchemaToZod } from "../lib/schema-to-zod";
import { useConfigMutation } from "../queries";
import { ConfigSchemaContext } from "./config-schema-context";
import { ProjectMeta } from "../lib/types";

export const CONFIG_FORM_ID = "config-form";

interface ModulesConfigFormProps extends ProjectMeta {
  children: ReactNode;
}

const stringToJSONSchema = z
  .string()
  .transform((str, ctx): z.infer<ZodString> => {
    try {
      return JSON.parse(str);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: "Invalid JSON" });
      return z.NEVER;
    }
  });

export function ModulesConfigForm({
  config,
  modules,
  children,
}: ModulesConfigFormProps) {
  const configSchema = useMemo(() => {
    const modulesSchema = Object.entries(modules).map(([name, module]) => {
      return [
        name,
        module.hasUserConfigSchema && module.userConfigSchema
          ? z
            .object({
              config: stringToJSONSchema.pipe(
                convertSchemaToZod(module.userConfigSchema),
              ),
              // FIXME: use zod schemas from opengb
            })
            .passthrough()
            .optional()
          // FIXME: use zod schemas from opengb
          : z
            .object({})
            .passthrough()
            .optional(),
      ];
    });
    const schema = z.object({
      modules: z.object(Object.fromEntries(modulesSchema)),
    });
    return schema;
  }, [modules]);

  const { Form } = useMemo(() => {
    return createSchemaForm(configSchema);
  }, [configSchema]);

  const defaultValues = useMemo(() => {
    const modulesDefaultValues = Object.entries(config.modules).map(
      ([name, module]) => {
        return [
          name,
          modules[name].hasUserConfigSchema
            ? {
              ...module,
              config: JSON.stringify(modules[name].userConfig, null, 2),
            }
            : module,
        ];
      },
    );
    return { modules: Object.fromEntries(modulesDefaultValues) };
  }, [config, modules]);

  const { mutateAsync } = useConfigMutation();

  return (
    <ConfigSchemaContext.Provider value={configSchema}>
      <Form
        id={CONFIG_FORM_ID}
        defaultValues={defaultValues}
        onSubmit={async (values) => {
          await mutateAsync(values);
        }}
      >
        {children}
      </Form>
    </ConfigSchemaContext.Provider>
  );
}
