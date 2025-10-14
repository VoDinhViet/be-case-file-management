import { relations } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { casesTable } from './cases.schema';
import { usersTable } from './users.schema';

// Loại thông báo
export enum NotificationTypeEnum {
  CASE_DEADLINE_SOON = 'CASE_DEADLINE_SOON', // Vụ án sắp hết hạn
  CASE_OVERDUE = 'CASE_OVERDUE', // Vụ án quá hạn
  CASE_ASSIGNED = 'CASE_ASSIGNED', // Được giao vụ án mới
  CASE_STATUS_CHANGED = 'CASE_STATUS_CHANGED', // Trạng thái vụ án thay đổi
  SYSTEM = 'SYSTEM', // Thông báo hệ thống
}

// expo notifications table
export const notificationsTable = pgTable('notifications', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => casesTable.id, {
    onDelete: 'cascade',
  }),
  type: varchar('type', { length: 50 })
    .notNull()
    .$type<NotificationTypeEnum>()
    .default(NotificationTypeEnum.SYSTEM),
  title: varchar('title', { length: 255 }).notNull(),
  body: varchar('body', { length: 500 }).notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
    case: one(casesTable, {
      fields: [notificationsTable.caseId],
      references: [casesTable.id],
    }),
  }),
);
