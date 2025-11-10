import { relations } from 'drizzle-orm';
import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sourcesTable } from './sources.schema';

// Bảng kế hoạch điều tra/vật chứng của nguồn tin
export const sourcePlansTable = pgTable(
  'source_plans',
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sourcesTable.id, { onDelete: 'cascade' }),
    investigationResult: text('investigation_result'), // kết quả điều tra
    exhibits: jsonb('exhibits').$type<string[]>().default([]).notNull(), // danh sách vật chứng
    nextInvestigationPurpose: text('next_investigation_purpose'), // mục đích yêu cầu điều tra tiếp theo
    nextInvestigationContent: jsonb('next_investigation_content')
      .$type<string[]>()
      .default([])
      .notNull(), // nội dung điều tra tiếp theo
    participatingForces: jsonb('participating_forces')
      .$type<string[]>()
      .default([])
      .notNull(), // lực lượng tham gia
    startDate: timestamp('start_date'), // ngày bắt đầu
    endDate: timestamp('end_date'), // ngày kết thúc
    budget: varchar('budget', { length: 255 }), // ngân sách
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'source_plans_source_id_fkey',
      columns: [table.sourceId],
      foreignColumns: [sourcesTable.id],
    }).onDelete('cascade'),
  ],
);

export const sourcePlansTableRelations = relations(
  sourcePlansTable,
  ({ one }) => ({
    source: one(sourcesTable, {
      fields: [sourcePlansTable.sourceId],
      references: [sourcesTable.id],
    }),
  }),
);

export type SourcePlanType = typeof sourcePlansTable.$inferSelect;

