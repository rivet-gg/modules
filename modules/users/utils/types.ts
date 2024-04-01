export interface User {
	id: string;
	username: string;
	createdAt: Date;
	updatedAt: Date;
	profilePictureUrl: string | null;
}
