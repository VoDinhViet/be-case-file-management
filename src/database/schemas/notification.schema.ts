import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// expo notifications table
export const notificationsTable = pgTable('notifications', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid().notNull(),
  title: varchar().notNull(),
  body: varchar().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
