import { relations } from 'drizzle-orm';
import {
  foreignKey,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { casePhasesTable } from './case-phases.schema';
import { templateFieldsTable, templatesTable } from './templates.schema';
import { usersTable } from './users.schema';

// Trạng thái vụ án
export enum CaseStatusEnum {
  PENDING = 'PENDING', // Chưa xử lý
  IN_PROGRESS = 'IN_PROGRESS', // Đang xử lý
  COMPLETED = 'COMPLETED', // Đã đóng
  ON_HOLD = 'ON_HOLD', // Tạm hoãn
  CANCELLED = 'CANCELLED', // Hủy bỏ
}

export const casesTable = pgTable('cases', {
  id: uuid().defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templatesTable.id),
  applicableLaw: varchar('applicable_law', { length: 255 }),
  numberOfDefendants: varchar('number_of_defendants', { length: 50 }),
  crimeType: varchar('crime_type', { length: 100 }),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 })
    .$type<CaseStatusEnum>()
    .notNull()
    .default(CaseStatusEnum.PENDING),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  userId: uuid('user_id'),
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
  assignee: one(usersTable, {
    fields: [casesTable.userId],
    references: [usersTable.id],
  }),
  groups: many(caseGroupsTable),
  phases: many(casePhasesTable),
}));

export const caseGroupsTable = pgTable(
  'case_groups',
  {
    id: uuid().defaultRandom().primaryKey(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => casesTable.id),
    groupId: uuid('group_id'), // optional, nếu muốn liên kết với template_groups
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'case_groups_case_id_fkey',
      columns: [table.caseId],
      foreignColumns: [casesTable.id],
    }).onDelete('cascade'),
  ],
);

export const caseFieldsTable = pgTable(
  'case_fields',
  {
    id: uuid().defaultRandom().primaryKey(),
    caseId: uuid('case_id').references(() => casesTable.id),
    groupId: uuid('group_id').references(() => caseGroupsTable.id),
    fieldId: uuid('field_id').references(() => templateFieldsTable.id), // optional
    fieldLabel: varchar('field_label', { length: 100 }),
    fieldName: varchar('field_name', { length: 100 }),
    fieldValue: text('field_value'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'case_fields_case_id_fkey',
      columns: [table.caseId],
      foreignColumns: [casesTable.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'case_fields_group_id_fkey',
      columns: [table.groupId],
      foreignColumns: [caseGroupsTable.id],
    }).onDelete('cascade'),
  ],
);

export const caseGroupsTableRelations = relations(
  caseGroupsTable,
  ({ one, many }) => ({
    case: one(casesTable, {
      fields: [caseGroupsTable.caseId],
      references: [casesTable.id],
    }),
    fields: many(caseFieldsTable),
  }),
);

export const caseFieldsTableRelations = relations(
  caseFieldsTable,
  ({ one }) => ({
    case: one(casesTable, {
      fields: [caseFieldsTable.caseId],
      references: [casesTable.id],
    }),
    group: one(caseGroupsTable, {
      fields: [caseFieldsTable.groupId],
      references: [caseGroupsTable.id],
    }),
    templateField: one(templateFieldsTable, {
      fields: [caseFieldsTable.fieldId],
      references: [templateFieldsTable.id],
    }),
  }),
);
