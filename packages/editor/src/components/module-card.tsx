import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  cn,
  Flex,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  JsonCode,
  MutedText,
  Text,
  WithTooltip,
} from "@rivet-gg/components";
import type { Module } from "@rivet-gg/opengb-shared-internals";
import { useFormContext } from "react-hook-form";

interface ConfigInputProps {
  moduleName: string;
}

function ConfigInput({ moduleName }: ConfigInputProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={`modules.${moduleName}.config`}
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>Configuration</FormLabel>
            <FormControl>
              <JsonCode
                {...field}
                value={field.value}
                onChange={(value) => field.onChange(value)}
              />
            </FormControl>
            <FormMessage>
              Invalid module configuration. Please check the docs for more information.
            </FormMessage>
          </FormItem>
        );
      }}
    />
  );
}

interface DeleteModuleButton {
  moduleName: string;
  content: string;
  isDisabled?: boolean;
}

function DeleteModuleButton({
  moduleName,
  content,
  isDisabled,
}: DeleteModuleButton) {
  const { setValue, getValues } = useFormContext();
  return (
    <WithTooltip
      content={content}
      trigger={
        <div>
          <Button
            size="icon-sm"
            type="button"
            variant="outline"
            disabled={isDisabled}
            onClick={() => {
              const { [moduleName]: moduleToRemove, ...otherModules } = getValues("modules");
              setValue("modules", otherModules, { shouldDirty: true });
            }}
          >
            <FontAwesomeIcon icon="trash" />
          </Button>
        </div>
      }
    />
  );
}

interface ModuleCardProps {
  module: Module;
  isRegistryExternal?: boolean;
  dependants: Module[];
}

export function ModuleCard({
  module,
  isRegistryExternal,
  dependants,
}: ModuleCardProps) {
  const { watch, resetField } = useFormContext();
  const modules = watch("modules");
  const isRemoved = modules[module.name] === undefined;
  const allDependantsRemoved = dependants?.every(
    (m) => modules[m.name] === undefined,
  );
  return (
    <section className="w-full scroll-mt-16" id={module.name}>
      <Card
        w="full"
        className={cn("my-2 bg-transparent", {
          "border-destructive opacity-40 pointer-events-none": isRemoved,
        })}
      >
        <header className="px-6">
          <Flex
            className="-mt-4 mb-1"
            direction="row"
            items="center"
            justify="between"
          >
            <h4 className="font-bold bg-background-main px-1 -ml-1">
              {module.config.icon ? <FontAwesomeIcon icon={module.config.icon} className="mr-2" /> : null}
              {module.config.name}
            </h4>
            <Flex gap="2" className="bg-background-main px-1 -ml-1">
              {isRegistryExternal
                ? (
                  <WithTooltip
                    content="Documentation"
                    trigger={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        type="button"
                        asChild
                      >
                        <a
                          href={`https://opengb.dev/modules/${module.name}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FontAwesomeIcon icon="book" />
                        </a>
                      </Button>
                    }
                  />
                )
                : null}

              <DeleteModuleButton
                content={dependants?.length > 0
                  ? `Remove dependants (${dependants.map((m) => m.config.name).join(", ")}) before removing this module`
                  : "Delete module"}
                isDisabled={!allDependantsRemoved}
                moduleName={module.name}
              />
            </Flex>
          </Flex>

          <CardDescription asChild className="text-xs mb-2">
            <Flex>
              <div>
                <p>{module.config.description}</p>
                {dependants?.length > 0
                  ? (
                    <p>
                      Dependants: {dependants.map((m) => m.config.name).join(", ")}.
                    </p>
                  )
                  : null}
              </div>
            </Flex>
          </CardDescription>
        </header>
        {module.hasUserConfigSchema
          ? (
            <CardContent>
              <ConfigInput moduleName={module.name} />
            </CardContent>
          )
          : (
            <CardContent>
              <Flex items="center" justify="center" my="6">
                <MutedText className="text-sm">
                  No configuration available.
                </MutedText>
              </Flex>
            </CardContent>
          )}
      </Card>
      {isRemoved
        ? (
          <Flex items="center" my="2" gap="2">
            <Text className="text-sm text-destructive">
              You marked this module to be removed.
            </Text>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                resetField(`modules.${module.name}`);
              }}
            >
              Restore
            </Button>
          </Flex>
        )
        : null}
    </section>
  );
}
