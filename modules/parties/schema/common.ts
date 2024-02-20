export interface Party {
	id: string;
	name: string;
	friends_only: boolean;

	owner_id: string;
	member_ids: string[];

	created_at: string;
}

export interface Identity {
	id: string;
	type: IdentityType;
}

export type IdentityType = { guest: IdentityTypeGuest };

export interface IdentityTypeGuest {}
