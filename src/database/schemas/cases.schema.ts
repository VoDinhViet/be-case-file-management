import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { templateFieldsTable, templatesTable } from './templates.schema';

export const casesTable = pgTable('cases', {
  id: uuid().defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templatesTable.id),
  // mã vụ án
  name: varchar('name', { length: 255 }).notNull(), // tên vụ án
  // tên vụ án
  description: text('description'), // mô tả vụ án
  // ngày bắt đầu vụ án
  startedAt: timestamp('started_at').defaultNow(),
  // ngày kết thúc vụ án
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const caseFieldsTable = pgTable('case_fields', {
  id: uuid().defaultRandom().primaryKey(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => casesTable.id), // liên kết với case
  fieldId: uuid('field_id')
    .notNull()
    .references(() => templateFieldsTable.id), // field template
  value: text('value'), // giá trị nhập
  createdAt: timestamp('created_at').defaultNow(),
});
