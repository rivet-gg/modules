/**
 * Identifies an email address and optionally a name.
 */
export interface Email {
	/** Target email. */
	email: string;
	/** Optional display name for the email. */
	name?: string;
}
