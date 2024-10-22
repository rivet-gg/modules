CREATE SCHEMA "module_auth_email";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_auth_email"."verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"token" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempt_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expire_at" timestamp NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "verifications_code_unique" UNIQUE("code"),
	CONSTRAINT "verifications_token_unique" UNIQUE("token")
);
