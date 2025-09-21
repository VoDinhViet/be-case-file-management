import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { rolesTable } from './roles.schema';
export const usersTable = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 256 }),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  username: varchar('username', { length: 128 }).notNull().unique(),
  password: varchar('password', { length: 256 }).notNull(),
  referralCode: varchar('referral_code', { length: 64 }).notNull(),
  roleId: uuid('role_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(usersTable, ({ one }) => ({
  role: one(rolesTable, {
    fields: [usersTable.roleId],
    references: [rolesTable.id],
  }),
}));

export type User = typeof usersTable.$inferSelect;
