import { Region } from "../../region.ts";

// MARK: Config
export type BackendTestConfig = Record<never, never>;

// MARK: Response
export type LobbyBackendTestResponse = Record<never, never>;

export const REGIONS: Region[] = [
  {
		id: "test",
		name: "Test",
		latitude: 33.67727501667558, 
		longitude: -106.47527637325621,
	}
];

