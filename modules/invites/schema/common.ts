export interface InviteOptions {
	from: string;
	to: string;
	for: string;

	directional: boolean;

	expiration?: {
		ms: number;
		hidden_after_expiration: boolean;
	};

	module: string;
}

export interface Invite extends InviteOptions {
	created: string;
	expires: string | null;
}
