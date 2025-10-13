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
import { casesTable } from './cases.schema';

// bảng giai đoạn vụ án
export const casePhasesTable = pgTable(
  'case_phases',
  {
    id: uuid().defaultRandom().primaryKey(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => casesTable.id),
    name: varchar('name', { length: 255 }).notNull(), // tên giai đoạn
    description: text('description'), // mô tả giai đoạn
    order: integer('order').notNull(), // thứ tự giai đoạn
    startDate: timestamp('start_date').notNull(), // ngày bắt đầu
    endDate: timestamp('end_date'), // ngày kết thúc
    isCompleted: boolean('is_completed').default(false).notNull(), // trạng thái hoàn thành
    createdAt: timestamp('created_at').defaultNow(),
    tasks: jsonb('tasks').default('[]').notNull(), // danh sách công việc trong giai đoạn
    note: text('note'), // ghi chú
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'case_phases_case_id_fkey',
      columns: [table.caseId],
      foreignColumns: [casesTable.id],
    }).onDelete('cascade'),
  ],
);

export const casePhasesTableRelations = relations(
  casePhasesTable,
  ({ one }) => ({
    case: one(casesTable, {
      fields: [casePhasesTable.caseId],
      references: [casesTable.id],
    }),
  }),
);
