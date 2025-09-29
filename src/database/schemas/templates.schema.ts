import { relations } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

//-----------------------------------------
// Bảng templates
//-----------------------------------------
export const templatesTable = pgTable('templates', {
  id: uuid().defaultRandom().primaryKey(), // ✅ alias rõ ràng
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

//-----------------------------------------
// Bảng template_groups
//-----------------------------------------
export const templateGroupsTable = pgTable('template_groups', {
  id: uuid().defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templatesTable.id),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

//-----------------------------------------
// Bảng template_fields
//-----------------------------------------
export const templateFieldsTable = pgTable('template_fields', {
  id: uuid().defaultRandom().primaryKey(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => templateGroupsTable.id),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }).notNull(),
  isRequired: boolean('is_required').notNull().default(false),
  placeholder: varchar('placeholder', { length: 255 }),
  options: text('options'),
  defaultValue: varchar('default_value', { length: 255 }),
  description: text('description'),
});

//-----------------------------------------
// Bảng case_files (ví dụ)
//-----------------------------------------
export const caseFilesTable = pgTable('case_files', {
  id: uuid().defaultRandom().primaryKey(),
  fieldId: uuid('field_id')
    .notNull()
    .references(() => templateFieldsTable.id), // ✅ đảm bảo đúng
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow(),
});

//-----------------------------------------
// Relations
//-----------------------------------------
export const templatesRelations = relations(templatesTable, ({ many }) => ({
  groups: many(templateGroupsTable),
}));

export const templateGroupsRelations = relations(
  templateGroupsTable,
  ({ one, many }) => ({
    template: one(templatesTable, {
      fields: [templateGroupsTable.templateId],
      references: [templatesTable.id],
    }),
    fields: many(templateFieldsTable),
  }),
);

export const templateFieldsRelations = relations(
  templateFieldsTable,
  ({ one, many }) => ({
    group: one(templateGroupsTable, {
      fields: [templateFieldsTable.groupId],
      references: [templateGroupsTable.id],
    }),
    caseFiles: many(caseFilesTable), // ✅ một field có nhiều caseFile
  }),
);

export const caseFilesRelations = relations(caseFilesTable, ({ one }) => ({
  field: one(templateFieldsTable, {
    fields: [caseFilesTable.fieldId],
    references: [templateFieldsTable.id],
  }),
}));
