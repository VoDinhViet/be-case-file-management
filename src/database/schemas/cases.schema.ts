import { relations } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { casePhasesTable } from './case-phases.schema';
import { casePlansTable } from './case-plans.schema';
import { templatesTable } from './templates.schema';
import { UserType, usersTable } from './users.schema';

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
  templateId: uuid('template_id').references(() => templatesTable.id, {
    onDelete: 'set null',
  }),
  applicableLaw: varchar('applicable_law', { length: 255 }),
  numberOfDefendants: varchar('number_of_defendants', { length: 50 }),
  crimeType: varchar('crime_type', { length: 100 }),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 })
    .$type<CaseStatusEnum>()
    .notNull()
    .default(CaseStatusEnum.PENDING),
  description: text('description'),
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
  plan: one(casePlansTable, {
    fields: [casesTable.id],
    references: [casePlansTable.caseId],
  }),
}));

export const caseGroupsTable = pgTable(
  'case_groups',
  {
    id: uuid().defaultRandom().primaryKey(),
    groupId: uuid('group_id'),
    caseId: uuid('case_id').notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    index: integer().notNull().default(0),
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
    caseId: uuid('case_id'),
    groupId: uuid('group_id'),
    fieldLabel: varchar('field_label', { length: 100 }).notNull(),
    fieldName: varchar('field_name', { length: 100 }).notNull(),
    fieldType: varchar('field_type', { length: 50 }).notNull().default('text'),
    fieldValue: text('field_value'), // lưu giá trị người dùng nhập
    isRequired: boolean('is_required').notNull().default(false),
    placeholder: varchar('placeholder', { length: 255 }),
    options: jsonb().$type<string[]>().default([]),
    defaultValue: varchar('default_value', { length: 255 }),
    isEditable: boolean('is_editable').notNull().default(true),
    index: integer().notNull().default(0),
    description: text('description'),
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
  }),
);

export type CaseType = typeof casesTable.$inferSelect & {
  assignee: UserType;
  groups: CaseGroupsType[];
};
export type CaseFieldsType = typeof caseFieldsTable.$inferSelect;
export type CaseGroupsType = typeof caseGroupsTable.$inferSelect;
