const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable";

export function getDatabaseUrl(): URL {
	return new URL(Deno.env.get("DATABASE_URL") ?? DEFAULT_DATABASE_URL);
}

/**
 * Returns a database URL that includes the schema as a query parameter. Only
 * Prisma handles schemas passed in the URL.
 */
export function getPrismaDatabaseUrlWithSchema(dbName: string): URL {
	const url = getDatabaseUrl();
	url.searchParams.set("schema", dbName);

	return url;
}
