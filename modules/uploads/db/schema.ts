import { Query, schema } from "./schema.gen.ts";

export const uploads = schema.table("uploads", {
	id: Query.uuid("id").primaryKey().defaultRandom(),
	metadata: Query.jsonb("metadata"),

	bucket: Query.text("bucket").notNull(),
	contentLength: Query.bigint("content_length", { mode: "bigint" }).notNull(),

	createdAt: Query.timestamp("created_at").notNull().defaultNow(),
	updatedAt: Query.timestamp("updated_at").notNull().$onUpdate(() =>
		new Date()
	),
	completedAt: Query.timestamp("completed_at"),
	deletedAt: Query.timestamp("deleted_at"),
});

export const uploadsRelations = Query.relations(uploads, (relation) => ({
	files: relation.many(files),
}));

export const files = schema.table("files", {
	uploadId: Query.uuid("upload_id").notNull().references(() => uploads.id),

	multipartUploadId: Query.text("multipart_upload_id"),

	path: Query.text("path").notNull(),
	mime: Query.text("mime"),
	contentLength: Query.bigint("content_length", { mode: "bigint" }).notNull(),
}, (table) => ({
	pk: Query.primaryKey({ columns: [table.uploadId, table.path] }),
}));
