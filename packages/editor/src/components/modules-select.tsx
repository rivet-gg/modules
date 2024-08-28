import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Combobox,
  type ComboboxProps,
  Flex,
} from "@rivet-gg/components";
import type { IndexedModule } from "@rivet-gg/opengb-shared-internals";
import { useSuspenseQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { metaQueryOptions } from "../queries";

interface ModulesSelectProps
  extends Omit<ComboboxProps, "options" | "onValueChange"> {
  placeholder?: string;
  onValueChange: (module: { name: string; registry: string }) => void;
}

export const ModulesSelect = forwardRef<HTMLButtonElement, ModulesSelectProps>(
  ({ placeholder, onValueChange, ...props }, ref) => {
    const { data } = useSuspenseQuery(metaQueryOptions());

    const options = Object.entries(data.registries).map(([slug, registry]) => {
      const options = Object.entries(registry.modules).map(
        ([moduleSlug, module]) => {
          const isInstalled = Object.entries(data.config.modules).some(
            ([key, module]) =>
              (module.module === moduleSlug || key === moduleSlug) &&
              (module.registry || "default") === slug,
          );
          return {
            label: (
              <ModulesSelectOption
                module={module}
                moduleSlug={moduleSlug}
                isInstalled={isInstalled}
              />
            ),
            isInstalled,
            value: `${slug}.${moduleSlug}`,
          };
        },
      );
      options.sort((a, b) => {
        if (a.isInstalled && !b.isInstalled) {
          return 1;
        }
        if (!a.isInstalled && b.isInstalled) {
          return -1;
        }
        return 0;
      });
      return { heading: `${slug} registry`, key: slug, options };
    });

    return (
      <Combobox
        ref={ref}
        className="w-full"
        {...props}
        onValueChange={(value) => {
          const [registry, name] = value.split(".");
          onValueChange({ registry, name });
        }}
        options={options}
        placeholder={placeholder}
        notFoundMessage="No modules found."
      />
    );
  },
);

interface ModulesSelectOptionProps {
  moduleSlug: string;
  module: IndexedModule;
  isInstalled?: boolean;
}

function ModulesSelectOption({
  module,
  moduleSlug,
  isInstalled,
}: ModulesSelectOptionProps) {
  return (
    <Flex gap="2" direction="col" asChild>
      <span>
        <span className="flex items-center gap-1">
          {module.icon ? (
            <FontAwesomeIcon icon={module.icon} className="w-4" />
          ) : null}
          <span className="text-left">
            {module.name ? (
              <span className="flex items-center">
                {module.name}{" "}
                <span className="text-xs font-mono text-muted-foreground ml-1">
                  ({moduleSlug})
                </span>
              </span>
            ) : (
              <>{moduleSlug} </>
            )}
          </span>
          {isInstalled ? <Badge variant="outline">INSTALLED</Badge> : null}
        </span>
        {module.description ? (
          <span className="text-xs text-muted-foreground block">
            {module.description}
          </span>
        ) : null}
      </span>
    </Flex>
  );
}
