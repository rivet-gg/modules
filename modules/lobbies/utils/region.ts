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
  slug: string;
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

// Using haversine formula to calculate approximate distance
function getDistance(a: RegionGeoCoords, b: RegionGeoCoords) {
  const EARTH_RADIUS = 6371; // Radius of the earth in km
  const DEG_2_RAD = (Math.PI / 180);

  const deltaLatitude = DEG_2_RAD * (b.latitude - a.latitude);
  const deltaLongitude = DEG_2_RAD * (b.longitude - a.longitude);
  
  const aLatitude = DEG_2_RAD * a.latitude;
  const bLatitude = DEG_2_RAD * b.latitude;

  const sinOfDLat = Math.sin(deltaLatitude / 2);
  const sinOfDLon = Math.sin(deltaLongitude / 2);
  const x = sinOfDLat * sinOfDLat + sinOfDLon * sinOfDLon * Math.cos(aLatitude) * Math.cos(bLatitude);
  const unitDistance = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); 

  return EARTH_RADIUS * unitDistance;
}

export function getClosestRegion(
  region: Region[],
  coords: RegionGeoCoords
) {
  let closestRegion: Region | null = null;
  let closestDistance = Infinity;
  for (const r of region) {
    const distance = getDistance(r, coords);
    if (distance < closestDistance) {
      closestRegion = r;
      closestDistance = distance;
    }
  }
  return closestRegion;
}

export function getSortedRegionsByProximity(
  regions: Region[],
  coords: RegionGeoCoords
) {
  return [...regions].sort((a, b) => {
    return getDistance(a, coords) - getDistance(b, coords);
  });
}