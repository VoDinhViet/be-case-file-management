import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { templateFields, templates } from './templates.schema';

export const caseFiles = pgTable('case_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templates.id, {
    onDelete: 'restrict',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const caseFilesRelations = relations(caseFiles, ({ one }) => ({
  template: one(templates, {
    fields: [caseFiles.templateId],
    references: [templates.id],
  }),
}));

// Case file data
export const caseFileData = pgTable('case_file_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  caseId: uuid('case_id').references(() => caseFiles.id, {
    onDelete: 'cascade',
  }),
  fieldId: uuid('field_id').references(() => templateFields.id, {
    onDelete: 'cascade',
  }),
  value: text('value'),
});

export const caseFileDataRelations = relations(caseFileData, ({ one }) => ({
  caseFile: one(caseFiles, {
    fields: [caseFileData.caseId],
    references: [caseFiles.id],
  }),
  field: one(templateFields, {
    fields: [caseFileData.fieldId],
    references: [templateFields.id],
  }),
}));
