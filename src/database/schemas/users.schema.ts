import { relations } from 'drizzle-orm';
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { RoleEnum } from '../../api/auth/types/role.enum';
export const usersTable = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey(),
    fullName: varchar('full_name', { length: 256 }),
    phone: varchar('phone', { length: 32 }).notNull().unique(),
    role: varchar('role', { length: 32 })
      .notNull()
      .$type<RoleEnum>()
      .default(RoleEnum.STAFF),
    password: varchar('password', { length: 256 }).notNull(),
    referralCode: varchar('referral_code', { length: 64 }),
    roleId: uuid('role_id'),
    createdBy: uuid('created_by'),
    // save token expo
    tokenExpo: varchar('token_expo', { length: 512 }),
    // save FCM token for push notifications
    fcmToken: varchar('fcm_token', { length: 512 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('full_name_idx').on(table.fullName),
    index('phone_idx').on(table.phone),
    index('role_idx').on(table.role),
  ],
);

export const usersRelations = relations(usersTable, ({ one }) => ({
  creator: one(usersTable, {
    fields: [usersTable.createdBy],
    references: [usersTable.id],
  }),
}));

export type UserType = typeof usersTable.$inferSelect;
