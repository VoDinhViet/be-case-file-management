import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { RoleEnum } from '../../api/auth/types/role.enum';
export const usersTable = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 256 }),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  role: varchar('role', { length: 32 })
    .notNull()
    .$type<RoleEnum>()
    .default(RoleEnum.STAFF),
  password: varchar('password', { length: 256 }).notNull(),
  referralCode: varchar('referral_code', { length: 64 }).notNull(),
  roleId: uuid('role_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const usersRelations = relations(usersTable, ({ one }) => ({}));

export type User = typeof usersTable.$inferSelect;
