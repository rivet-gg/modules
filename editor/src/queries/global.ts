import { toast } from "@rivet-gg/components";
import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import superjson from "superjson";

const queryCache = new QueryCache();

const mutationCache = new MutationCache({
  onError(error) {
    console.log(error);
    toast.error("An error occurred while performing the operation.");
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
});

export const queryClientPersister = createSyncStoragePersister({
  storage: window.localStorage,
  serialize: superjson.stringify,
  deserialize: superjson.parse,
});

broadcastQueryClient({
  queryClient,
  broadcastChannel: "rivet-gg-opengb",
});
