CREATE SCHEMA "module_tokens";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_tokens"."tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"type" text NOT NULL,
	"meta" jsonb NOT NULL,
	"trace" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expire_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "tokens_token_unique" UNIQUE("token")
);
