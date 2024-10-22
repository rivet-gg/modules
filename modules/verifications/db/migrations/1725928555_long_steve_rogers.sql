CREATE SCHEMA "module_verifications";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_verifications"."old_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"code" text NOT NULL,
	"token" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"was_completed" boolean NOT NULL,
	"created_at" timestamp NOT NULL,
	"invalidated_at" timestamp,
	"expired_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "old_verifications_code_unique" UNIQUE("code"),
	CONSTRAINT "old_verifications_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_verifications"."verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" jsonb NOT NULL,
	"code" text NOT NULL,
	"token" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempt_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expire_at" timestamp NOT NULL,
	CONSTRAINT "verifications_code_unique" UNIQUE("code"),
	CONSTRAINT "verifications_token_unique" UNIQUE("token")
);
