import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/pro-solid-svg-icons";
import {
  FullscreenLoading,
  Toaster,
  TooltipProvider,
} from "@rivet-gg/components";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Suspense } from "react";
import { queryClient } from "./queries/global";
import { routeTree } from "./routeTree.gen";
library.add(fas);

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
  interface StaticDataRouteOption {
    layout?: "full" | "compact";
  }
}

declare global {
  namespace RivetApp {
    interface Config {}
  }
}

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
  defaultOnCatch: (error) => {
    Sentry.captureException(error);
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<FullscreenLoading />}>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </Suspense>

      <Toaster />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
