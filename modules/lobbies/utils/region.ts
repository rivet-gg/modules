import {
	REGIONS as TEST_REGIONS,
} from "./lobby/backend/test.ts";
import {
	REGIONS as SERVER_REGIONS,
} from "./lobby/backend/server.ts";
import { REGIONS as LOCAL_DEVELOPMENT_REGIONS } from "./lobby/backend/local_development.ts";
import { UnreachableError } from "../module.gen.ts";
import { LobbyBackend } from "../config.ts";

export interface RegionGeoCoords {
  latitude: number;
  longitude: number;
}


export interface Region extends RegionGeoCoords {
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

export const EMPTY_GEO_COORDS: RegionGeoCoords = Object.freeze({
  latitude: 0,
  longitude: 0
});

const getDistSq = (a: RegionGeoCoords, b: RegionGeoCoords) => {
  const dlat = a.latitude - b.latitude;
  const dlong = a.longitude - b.longitude;
  return dlat * dlat + dlong * dlong;
}

export function getClosestRegion(
  region: Region[],
  coords: RegionGeoCoords
) {
  if (coords === EMPTY_GEO_COORDS) return region[0];
  let closestRegion: Region | null = null;
  let closestDistance = Infinity;
  for (const r of region) {
    const distSq = getDistSq(r, coords);
    if (distSq < closestDistance) {
      closestRegion = r;
      closestDistance = distSq;
    }
  }
  return closestRegion;
}

export function getSortedRegionsByProximity(
  regions: Region[],
  coords: RegionGeoCoords
) {
  if (coords === EMPTY_GEO_COORDS) return [...regions];
  return [...regions].sort((a, b) => {
    return getDistSq(a, coords) - getDistSq(b, coords);
  });
}