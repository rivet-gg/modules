import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Strong, WithTooltip } from "@rivet-gg/components";
import { useQuery } from "@tanstack/react-query";
import { type PropsWithChildren, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFormContext } from "react-hook-form";
import { download } from "../lib/download";
import { metaQueryOptions, stateQueryOptions } from "../queries";
import { queryClient } from "../queries/global";
import { BannerContext } from "./banner-context";
import { ConfigSchemaContext } from "./config-schema-context";
import { CONFIG_FORM_ID } from "./modules-config-form";

function Container(props: PropsWithChildren) {
  return (
    <div className="w-full bg-primary/10 p-4 -mb-2 border-t px-8 flex justify-between items-center">
      {props.children}
    </div>
  );
}

function Content() {
  const { data: state } = useQuery(stateQueryOptions());
  const configSchema = useContext(ConfigSchemaContext);
  const { formState, getValues, reset, trigger } = useFormContext();

  useEffect(() => {
    if (state?.value === "failure") {
      queryClient.refetchQueries(metaQueryOptions()).then(() => {
        trigger("modules", { shouldFocus: true });
      });
    }
  }, [state?.value, trigger]);

  if (formState.isDirty) {
    return (
      <Container>
        <span>You have unsaved changes.</span>
        <div className="flex gap-2">
          <WithTooltip
            content="Configuration will be saved to your backend.json file"
            trigger={
              <Button
                isLoading={formState.isSubmitting}
                type="submit"
                form={CONFIG_FORM_ID}
              >
                Save
              </Button>
            }
          />
          <WithTooltip
            content={formState.isValid
              ? "Export your configuration to a file"
              : "Configuration is invalid, please fix errors before exporting"}
            trigger={
              <div>
                <Button
                  disabled={formState.isSubmitting || !formState.isValid}
                  onClick={() =>
                    download(
                      JSON.stringify(configSchema?.parse(getValues()), null, 2),
                      "application/json",
                      "backend.json",
                    )}
                  size="icon"
                  variant="outline"
                >
                  <FontAwesomeIcon icon="download" />
                </Button>
              </div>
            }
          />
          <Button
            disabled={formState.isSubmitting}
            variant="outline"
            onClick={() => reset()}
          >
            Discard
          </Button>
        </div>
      </Container>
    );
  }

  if (state?.value === "failure") {
    if (
      state.error &&
      state.error.name === "CombinedError" &&
      state.error.errors.some((e) => e.name === "ValidationError")
    ) {
      const validationErrors = state.error.errors.filter(
        (e): e is ValidationError => e.name === "ValidationError",
      );
      return (
        <Container>
          <div className="flex justify-between w-full items-center">
            <p>
              <Strong>OpenGB server has failed to start.</Strong> Modules (
              {validationErrors.map((e) => e.info.moduleName).join(", ")}) have invalid configurations. Consult the docs
              for more information.
            </p>
            <Button
              asChild
              variant="outline"
              onClick={() => trigger("modules")}
            >
              <a
                href="https://opengb.dev/docs/build/overview"
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
            </Button>
          </div>
        </Container>
      );
    }
    return (
      <Container>
        <Strong>OpenGB server has failed to start.</Strong> Please check the logs for more information.
      </Container>
    );
  }

  return null;
}

export function MessageBanner() {
  const { banner } = useContext(BannerContext);

  if (!banner) {
    return null;
  }

  return createPortal(<Content />, banner);
}
