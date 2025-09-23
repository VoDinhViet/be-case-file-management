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
export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

//-----------------------------------------
// Bảng template_fields
//-----------------------------------------
export const templateFields = pgTable('template_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }).notNull(), // e.g., 'string', 'number', 'boolean'
  isRequired: boolean('is_required').notNull().default(false), // boolean true/false
});

//-----------------------------------------
// Relations
//-----------------------------------------
export const templatesRelations = relations(templates, ({ many }) => ({
  fields: many(templateFields),
}));

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(templates, {
    fields: [templateFields.templateId],
    references: [templates.id],
  }),
}));
