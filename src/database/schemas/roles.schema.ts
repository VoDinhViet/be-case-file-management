import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const rolesTable = pgTable('roles', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  priority: integer('priority').notNull(), // càng cao quyền càng lớn
});

export type Role = typeof rolesTable.$inferSelect;
