import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { templateFieldsTable, templatesTable } from './templates.schema';
import { usersTable } from './users.schema';

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
  userId: uuid('user_id'), // người tạo vụ án
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const casesTableRelations = relations(casesTable, ({ one, many }) => ({
  template: one(templatesTable, {
    fields: [casesTable.templateId],
    references: [templatesTable.id],
  }),
  // người thụ lý vụ án
  assignee: one(usersTable, {
    fields: [casesTable.userId],
    references: [usersTable.id],
  }),
  // các trường dữ liệu của vụ án
  fields: many(caseFieldsTable),
}));

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

export const caseFieldsTableRelations = relations(
  caseFieldsTable,
  ({ one }) => ({
    case: one(casesTable, {
      fields: [caseFieldsTable.caseId],
      references: [casesTable.id],
    }),
    field: one(templateFieldsTable, {
      fields: [caseFieldsTable.fieldId],
      references: [templateFieldsTable.id],
    }),
  }),
);
