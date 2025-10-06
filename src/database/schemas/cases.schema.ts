import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { templateFieldsTable, templatesTable } from './templates.schema';
import { usersTable } from './users.schema';

// trang  thái vụ án
export enum CaseStatusEnum {
  // chưa xử lý
  PENDING = 'PENDING',
  // đang xử lý
  IN_PROGRESS = 'IN_PROGRESS',
  // đã hoàn thành
  COMPLETED = 'COMPLETED',
  // đã hủy
  CANCELED = 'CANCELED',
}

export const casesTable = pgTable('cases', {
  id: uuid().defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => templatesTable.id),
  applicableLaw: varchar('applicable_law', { length: 255 }), // điều luật áp dụng
  numberOfDefendants: varchar('number_of_defendants', { length: 50 }), // số bị cáo
  crimeType: varchar('crime_type', { length: 100 }), // loại tội phạm
  name: varchar('name', { length: 255 }), // tên vụ án
  status: varchar('status', { length: 50 })
    .$type<CaseStatusEnum>()
    .notNull()
    .default(CaseStatusEnum.PENDING), // trạng thái vụ án
  // nội dung vụ án
  description: text('description'), // mô tả vụ án
  // ngày bắt đầu vụ án
  startDate: timestamp('start_date').notNull(),
  // ngày kết thúc vụ án
  endDate: timestamp('end_date'),
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
