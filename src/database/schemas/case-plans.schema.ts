import { relations } from 'drizzle-orm';
import {
  foreignKey,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { casesTable } from './cases.schema';

// Bảng kế hoạch điều tra/vật chứng của vụ án
export const casePlansTable = pgTable(
  'case_plans',
  {
    id: uuid().defaultRandom().primaryKey(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => casesTable.id, { onDelete: 'cascade' }),
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
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      name: 'case_plans_case_id_fkey',
      columns: [table.caseId],
      foreignColumns: [casesTable.id],
    }).onDelete('cascade'),
  ],
);

export const casePlansTableRelations = relations(casePlansTable, ({ one }) => ({
  case: one(casesTable, {
    fields: [casePlansTable.caseId],
    references: [casesTable.id],
  }),
}));

export type CasePlanType = typeof casePlansTable.$inferSelect;
