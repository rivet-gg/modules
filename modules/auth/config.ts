export interface Config {
	email?: EmailConfig;
}

export interface EmailConfig {
	fromEmail: string;
	fromName?: string;
}
