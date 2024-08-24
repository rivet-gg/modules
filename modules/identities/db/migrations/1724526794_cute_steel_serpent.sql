CREATE SCHEMA "module_identities";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_identities"."user_identities" (
	"user_id" uuid NOT NULL,
	"identity_type" text NOT NULL,
	"identity_id" text NOT NULL,
	"unique_data" jsonb NOT NULL,
	"additional_data" jsonb NOT NULL,
	CONSTRAINT "user_identities_user_id_identity_type_identity_id_pk" PRIMARY KEY("user_id","identity_type","identity_id"),
	CONSTRAINT "user_identities_identity_type_identity_id_unique_data_unique" UNIQUE("identity_type","identity_id","unique_data")
);
