export interface Config {
	enable: {
		passwordless?: boolean;
		withPassword?: boolean;
		linking?: boolean;
	};
	fromEmail?: string;
	fromName?: string;
}
