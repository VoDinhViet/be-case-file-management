import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const referralTable = pgTable('referrals', {
  id: uuid().defaultRandom().primaryKey(),
  code: varchar({ length: 50 }).notNull().$type<string>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Referral = typeof referralTable.$inferSelect;
