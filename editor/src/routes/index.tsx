import { faPlus } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Code,
  Flex,
  H4,
  Link as RivetLink,
  Separator,
  SidebarNavigation,
  SidebarPageContent,
} from "@rivet-gg/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useContext } from "react";
import { MessageBanner } from "../components/message-banner";
import { ModuleCard } from "../components/module-card";
import { ModuleSearchContext } from "../components/module-search-context";
import { ModulesConfigForm } from "../components/modules-config-form";
import { NewModuleCard } from "../components/new-module-card";
import { metaQueryOptions } from "../queries";

function NewModuleButton() {
  const ref = useContext(ModuleSearchContext);
  return (
    <Button
      size="sm"
      className="text-foreground"
      startIcon={<FontAwesomeIcon icon={faPlus} />}
      variant="outline"
      onClick={() => ref?.current?.click()}
    >
      Add module
    </Button>
  );
}

function IndexRoute() {
  const { data } = useSuspenseQuery(metaQueryOptions());

  return (
    <SidebarPageContent
      sidebar={
        <SidebarNavigation>
          <H4 className="text-foreground">Modules</H4>
          <NewModuleButton />
          {Object.entries(data?.modules).map(([name, module]) => {
            return (
              <Link to="/" hash={name} key={name}>
                {module.config.icon ? <FontAwesomeIcon icon={module.config.icon} className="mr-1" /> : null}
                {module.config.name || module.namePascal}
              </Link>
            );
          })}
        </SidebarNavigation>
      }
    >
      <Flex direction="col" items="start" gap="4">
        <NewModuleCard />
        <Separator my="4" />
        <ModulesConfigForm {...data}>
          <MessageBanner />
          {Object.entries(data?.modules).map(([name, module]) => (
            <ModuleCard
              key={name}
              module={module}
              dependants={Object.values(data.modules).filter(
                (m) => m.config.dependencies?.[name] !== undefined,
              )}
              isRegistryExternal={data.registries[module.registryName]?.isExternal}
            />
          ))}
        </ModulesConfigForm>
        <Card w="full" className="bg-background-main">
          <CardHeader>
            <CardTitle>Build your own module</CardTitle>
          </CardHeader>
          <CardContent>
            <Flex gap="2">
              <Button variant="outline" asChild>
                <a
                  href="https://opengb.dev/docs/build/overview"
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentation
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://github.com/rivet-gg/opengb/issues/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  Request module
                </a>
              </Button>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </SidebarPageContent>
  );
}

export const Route = createFileRoute("/")({
  component: IndexRoute,
  pendingComponent: () => (
    <Card>
      <CardHeader>
        <CardTitle>Waiting for OpenGB server...</CardTitle>
        <CardDescription>
          Taking longer than expected? Take a look at the terminal, maybe something's wrong.
        </CardDescription>
      </CardHeader>
    </Card>
  ),
  errorComponent: ({ error }) => (
    <Card>
      <CardHeader>
        <CardTitle>Uh oh. There was an error.</CardTitle>
        <CardDescription>
          This page has lost connection to OpenGB local server. Try refreshing the page, or take a look at the terminal
          for more information. In case the issue still persist, create an issue on{" "}
          <RivetLink href="https://github.com/rivet-gg/opengb/issues/new">
            GitHub
          </RivetLink>{" "}
          or <RivetLink href="https://rivet.gg/discord">contact us</RivetLink>!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Code>
          {"toString" in error ? error.toString() : JSON.stringify(error)}
        </Code>
      </CardContent>
    </Card>
  ),
});
