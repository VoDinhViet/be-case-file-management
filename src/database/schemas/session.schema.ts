import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { usersTable } from './users.schema';
export const sessionTable = pgTable(
  'session',
  {
    id: uuid().defaultRandom().primaryKey(),
    hash: text().notNull(),
    userId: uuid('user_id').notNull(),
    createdBy: varchar('created_by').notNull(),
    updatedBy: varchar('updated_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'session_userId_fk',
      columns: [table.userId],
      foreignColumns: [usersTable.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
);
