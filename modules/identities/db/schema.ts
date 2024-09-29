import { Query, schema } from "./schema.gen.ts";

export const userIdentities = schema.table("user_identities", {
	userId: Query.uuid("user_id").notNull(),

	// Overarching identity type: email, sms, oauth, etc.
	identityType: Query.text("identity_type").notNull(),

	// Specific identity type
	// email:
	// - passwordless
	// - password
	// - etc.
	// oauth:
	// - google
	// - facebook
	// - etc.
	identityId: Query.text("identity_id").notNull(),

	// The data that is unique to this identity.
	// In the case of username, this would be the username.
	// In the case of email, this would be the email address.
	// In the case of oauth, this would be the oauth identity's "sub" field.
	uniqueData: Query.jsonb("unique_data").notNull(),

	// Additional data that is stored with the identity.
	// This can be used to store things like oauth tokens, last login time, etc.
	// Data here only needs to be handled by the specific identity provider.
	additionalData: Query.jsonb("additional_data").notNull(),
}, (table) => ({
	pk: Query.primaryKey({
		columns: [table.userId, table.identityType, table.identityId],
	}),
	uniqueConstraint: Query.unique().on(
		table.identityType,
		table.identityId,
		table.uniqueData,
	),
}));
