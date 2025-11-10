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
import { sourcePhasesTable } from './source-phases.schema';
import { sourcePlansTable } from './source-plans.schema';
import { templatesTable } from './templates.schema';
import { UserType, usersTable } from './users.schema';

// Trạng thái nguồn tin
export enum SourceStatusEnum {
  PENDING = 'PENDING', // Chưa xử lý
  IN_PROGRESS = 'IN_PROGRESS', // Đang xử lý
  COMPLETED = 'COMPLETED', // Đã đóng
  ON_HOLD = 'ON_HOLD', // Tạm hoãn
  CANCELLED = 'CANCELLED', // Hủy bỏ
}

export const sourcesTable = pgTable('sources', {
  id: uuid().defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templatesTable.id, {
    onDelete: 'set null',
  }),
  applicableLaw: varchar('applicable_law', { length: 255 }),
  numberOfDefendants: varchar('number_of_defendants', { length: 50 }),
  crimeType: varchar('crime_type', { length: 100 }),
  name: varchar('name', { length: 255 }),
  status: varchar('status', { length: 50 })
    .$type<SourceStatusEnum>()
    .notNull()
    .default(SourceStatusEnum.PENDING),
  description: text('description'),
  userId: uuid('user_id').references(() => usersTable.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sourcesTableRelations = relations(
  sourcesTable,
  ({ one, many }) => ({
    template: one(templatesTable, {
      fields: [sourcesTable.templateId],
      references: [templatesTable.id],
    }),
    assignee: one(usersTable, {
      fields: [sourcesTable.userId],
      references: [usersTable.id],
    }),
    groups: many(sourceGroupsTable),
    phases: many(sourcePhasesTable),
    plan: one(sourcePlansTable, {
      fields: [sourcesTable.id],
      references: [sourcePlansTable.sourceId],
    }),
  }),
);

export const sourceGroupsTable = pgTable(
  'source_groups',
  {
    id: uuid().defaultRandom().primaryKey(),
    groupId: uuid('group_id'),
    sourceId: uuid('source_id').notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    index: integer().notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'source_groups_source_id_fkey',
      columns: [table.sourceId],
      foreignColumns: [sourcesTable.id],
    }).onDelete('cascade'),
  ],
);

export const sourceFieldsTable = pgTable(
  'source_fields',
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceId: uuid('source_id'),
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
      name: 'source_fields_source_id_fkey',
      columns: [table.sourceId],
      foreignColumns: [sourcesTable.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'source_fields_group_id_fkey',
      columns: [table.groupId],
      foreignColumns: [sourceGroupsTable.id],
    }).onDelete('cascade'),
  ],
);

export const sourceGroupsTableRelations = relations(
  sourceGroupsTable,
  ({ one, many }) => ({
    source: one(sourcesTable, {
      fields: [sourceGroupsTable.sourceId],
      references: [sourcesTable.id],
    }),
    fields: many(sourceFieldsTable),
  }),
);

export const sourceFieldsTableRelations = relations(
  sourceFieldsTable,
  ({ one }) => ({
    source: one(sourcesTable, {
      fields: [sourceFieldsTable.sourceId],
      references: [sourcesTable.id],
    }),
    group: one(sourceGroupsTable, {
      fields: [sourceFieldsTable.groupId],
      references: [sourceGroupsTable.id],
    }),
  }),
);

export type SourceType = typeof sourcesTable.$inferSelect & {
  assignee: UserType;
  groups: SourceGroupsType[];
};
export type SourceFieldsType = typeof sourceFieldsTable.$inferSelect;
export type SourceGroupsType = typeof sourceGroupsTable.$inferSelect;
