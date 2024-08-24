CREATE SCHEMA "module_uploads";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_uploads"."files" (
	"upload_id" uuid NOT NULL,
	"multipart_upload_id" text,
	"path" text NOT NULL,
	"mime" text,
	"content_length" bigint NOT NULL,
	CONSTRAINT "files_upload_id_path_pk" PRIMARY KEY("upload_id","path")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_uploads"."uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"bucket" text NOT NULL,
	"content_length" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_uploads"."files" ADD CONSTRAINT "files_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "module_uploads"."uploads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
