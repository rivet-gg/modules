CREATE SCHEMA "module_currency";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_currency"."user_wallets" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"balance" integer NOT NULL
);
