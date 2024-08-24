CREATE SCHEMA "module_user_passwords";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_user_passwords"."passwords" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"algo" text NOT NULL
);
