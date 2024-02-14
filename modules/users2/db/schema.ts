import { sql } from 'npm:drizzle-orm@^0.29.3';
import { pgTable, text, uuid, timestamp } from 'npm:drizzle-orm@^0.29.3/pg-core';

export const users = pgTable('users', {
	id: uuid('id').primaryKey(),
	username: text('username'),
});

export const identities = pgTable('identities', {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    createdAt: timestamp('created_at').default(sql`timezone('utc', now())`),
});

export const identityGuests = pgTable('identity_guests', {
    identityId: uuid('identity_id').primaryKey().references(() => identities.id),
});
