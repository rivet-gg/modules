import {
	REGIONS as TEST_REGIONS,
} from "./lobby/backend/test.ts";
import {
	REGIONS as SERVER_REGIONS,
} from "./lobby/backend/server.ts";
import { REGIONS as LOCAL_DEVELOPMENT_REGIONS } from "./lobby/backend/local_development.ts";
import { UnreachableError } from "../module.gen.ts";
import { LobbyBackend } from "../config.ts";

export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export function regionsForBackend(backend: LobbyBackend): Region[] {
  if ("test" in backend) return TEST_REGIONS;
  else if ("localDevelopment" in backend) return LOCAL_DEVELOPMENT_REGIONS;
  else if ("server" in backend) return SERVER_REGIONS;
  else throw new UnreachableError(backend);
}

