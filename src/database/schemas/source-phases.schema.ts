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
import { sourcesTable } from './sources.schema';

// bảng giai đoạn nguồn tin
export const sourcePhasesTable = pgTable(
  'source_phases',
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sourcesTable.id),
    name: varchar('name', { length: 255 }).notNull(), // tên giai đoạn
    description: text('description'), // mô tả giai đoạn
    order: integer('order').notNull(), // thứ tự giai đoạn
    startDate: timestamp('start_date').notNull(), // ngày bắt đầu
    endDate: timestamp('end_date'), // ngày kết thúc dự kiến
    isCompleted: boolean('is_completed').default(false).notNull(), // trạng thái hoàn thành
    completedAt: timestamp('completed_at'), // ngày hoàn thành thực tế
    createdAt: timestamp('created_at').defaultNow(),
    tasks: jsonb('tasks').default('[]').notNull(), // danh sách công việc trong giai đoạn
    note: text('note'), // ghi chú
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'source_phases_source_id_fkey',
      columns: [table.sourceId],
      foreignColumns: [sourcesTable.id],
    }).onDelete('cascade'),
  ],
);

export const sourcePhasesTableRelations = relations(
  sourcePhasesTable,
  ({ one }) => ({
    source: one(sourcesTable, {
      fields: [sourcePhasesTable.sourceId],
      references: [sourcesTable.id],
    }),
  }),
);

export type SourcePhasesType = typeof sourcePhasesTable.$inferSelect;

