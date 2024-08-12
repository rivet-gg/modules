const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable";
// export const DATABASE_IMAGE = "postgres:16";
export const DATABASE_IMAGE = "timescale/timescaledb-ha:pg16";
export function getDatabaseUrl(): URL {
	return new URL(Deno.env.get("DATABASE_URL") ?? DEFAULT_DATABASE_URL);
}
