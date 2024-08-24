CREATE SCHEMA "module_users";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_users"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_token_unique" UNIQUE("token")
);
