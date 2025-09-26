import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { templateFields, templates } from './templates.schema';
import { usersTable } from './users.schema';

export const caseFiles = pgTable('case_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Điều luật\
  legalArticle: varchar('legal_article', { length: 255 }).notNull(),
  // nội dung vụ án
  content: text('content').notNull(),
  // số bị can
  numberOfDefendants: integer('number_of_defendants').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  // Mẫu hồ sơ
  templateId: uuid('template_id').references(() => templates.id, {
    onDelete: 'restrict',
  }),
  //cán bộ thụ lý
  officerInCharge: uuid().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const caseFilesRelations = relations(caseFiles, ({ one }) => ({
  template: one(templates, {
    fields: [caseFiles.templateId],
    references: [templates.id],
  }),
  officerInCharge: one(usersTable, {
    fields: [caseFiles.officerInCharge],
    references: [usersTable.id],
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
