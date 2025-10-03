import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import {
  caseFieldsTable,
  casesTable,
  templateFieldsTable,
  templateGroupsTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { CreateCaseDto } from './dto/create-case.req.dto';

@Injectable()
export class CasesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async getTemplateFields(templateId: string) {
    return this.db
      .select({
        groupId: templateGroupsTable.id,
        groupTitle: templateGroupsTable.title,
        fieldId: templateFieldsTable.id,
        fieldName: templateFieldsTable.fieldName,
        fieldLabel: templateFieldsTable.fieldLabel,
        fieldType: templateFieldsTable.fieldType,
        isRequired: templateFieldsTable.isRequired,
        placeholder: templateFieldsTable.placeholder,
        options: templateFieldsTable.options,
        defaultValue: templateFieldsTable.defaultValue,
        isEdit: templateFieldsTable.isEdit,
        description: templateFieldsTable.description,
      })
      .from(templateGroupsTable)
      .leftJoin(
        templateFieldsTable,
        eq(templateFieldsTable.groupId, templateGroupsTable.id),
      )
      .where(eq(templateGroupsTable.templateId, templateId));
  }
  async createCase(reqDto: CreateCaseDto) {
    console.log('Creating case with data:', reqDto);
    // 1. Insert vào bảng cases
    const [newCase] = await this.db
      .insert(casesTable)
      .values({
        templateId: reqDto.templateId,
        userId: reqDto.userId,
        name: Math.random().toString(36).substring(2, 8).toUpperCase(), // Tạo mã ngẫu nhiên
        description: reqDto.description,
        startedAt: reqDto.startDate ? new Date(reqDto.startDate) : undefined,
        endedAt: reqDto.endDate ? new Date(reqDto.endDate) : undefined,
      })
      .returning();
    // 2. Lấy mapping fieldName -> fieldId từ templateFieldsTable
    const templateFields = await this.getTemplateFields(reqDto.templateId);
    console.log('Template Fields:', templateFields);

    const fieldMap = new Map(
      templateFields.map((f) => [f.fieldName, f.fieldId]), // giả sử templateFieldsTable có cột name
    );
    console.log('Field Map:', fieldMap);
    // 3. Insert vào bảng caseFields
    if (reqDto.fields?.length) {
      const values = reqDto.fields
        .filter((f) => fieldMap.has(f.fieldName))
        .map((f) => ({
          caseId: newCase.id,
          fieldId: fieldMap.get(f.fieldName)!,
          value: f.value,
        }));

      if (values.length > 0) {
        await this.db.insert(caseFieldsTable).values(values);
      }
    }
    return newCase;
  }

  getPageCases() {
    return this.db.query.casesTable.findMany({
      orderBy: [desc(casesTable.createdAt)],
      with: {
        template: true,
        fields: true,
        assignee: true,
      },
      limit: 10,
      offset: 0,
    });
  }
}
