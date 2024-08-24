CREATE SCHEMA "module_friends";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_friends"."friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"declined_at" timestamp,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_friends"."friends" (
	"user_id_a" uuid NOT NULL,
	"user_id_b" uuid NOT NULL,
	"friend_request_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	CONSTRAINT "friends_user_id_a_user_id_b_pk" PRIMARY KEY("user_id_a","user_id_b")
);
