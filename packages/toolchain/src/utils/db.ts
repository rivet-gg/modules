const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable";

export function getDatabaseUrl(): URL {
	return new URL(Deno.env.get("DATABASE_URL") ?? DEFAULT_DATABASE_URL);
}
