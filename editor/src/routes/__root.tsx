import { FullscreenLoading } from "@rivet-gg/components";
import { Header } from "@rivet-gg/components/header";
import { PageLayout, RootLayout } from "@rivet-gg/components/layout";
import {
  type QueryClient,
  useIsMutating,
  useQuery,
} from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Suspense, forwardRef, useState } from "react";
import logoUrl from "../assets/logo.svg";
import { BannerContext } from "../components/banner-context";
import { ModuleSearchProvider } from "../components/module-search-context";
import { stateQueryOptions } from "../queries";

function RootRoute() {
  const [banner, setBanner] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <Suspense fallback={<FullscreenLoading />}>
        <RootLayout.Root>
          <OpenGBHeader ref={setBanner} />
          <RootLayout.Main>
            <PageLayout.Root>
              <BannerContext.Provider value={{ banner }}>
                <ModuleSearchProvider>
                  <Suspense fallback={"hello"}>
                    <Outlet />
                  </Suspense>
                </ModuleSearchProvider>
              </BannerContext.Provider>
            </PageLayout.Root>
          </RootLayout.Main>
          <RootLayout.Footer>
            &copy; {new Date().getFullYear()} Rivet Gaming, Inc. All rights
            reserved
          </RootLayout.Footer>
        </RootLayout.Root>
      </Suspense>

      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </>
  );
}

const OpenGBHeader = forwardRef<HTMLDivElement>((_, ref) => {
  const isMutating = useIsMutating();
  const { data: state } = useQuery(stateQueryOptions());

  return (
    <Header
      suffix={<div ref={ref} className="empty:hidden w-full mt-2" />}
      addons={
        isMutating || state?.value === "building" ? <Header.Progress /> : null
      }
      logo={
        <Link to="/">
          <img className="h-6" alt="OpenGB Logo" src={logoUrl} />
        </Link>
      }
    />
  );
});

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRoute,
});
