CREATE SCHEMA "module_auth_oauth";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_auth_oauth"."login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"state" text NOT NULL,
	"code_verifier" text NOT NULL,
	"identifier" text,
	"token_data" jsonb,
	"action_data" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"invalidated_at" timestamp
);
