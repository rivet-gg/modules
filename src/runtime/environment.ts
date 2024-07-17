export interface Environment {
	get(key: string): string | undefined;
}
