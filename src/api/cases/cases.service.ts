import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { ErrorCode } from '../../constants/error-code.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  caseFieldsTable,
  caseGroupsTable,
  casesTable,
  templateFieldsTable,
  templateGroupsTable,
} from '../../database/schemas';
import { casePhasesTable } from '../../database/schemas/case-phases.schema';
import type {
  DrizzleDB,
  FindManyQueryConfig,
} from '../../database/types/drizzle';
import { ValidationException } from '../../exceptions/validation.exception';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CreateCaseDto } from './dto/create-case.req.dto';
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';

@Injectable()
export class CasesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async getTemplateGroups(templateId: string) {
    return this.db
      .select()
      .from(templateGroupsTable)
      .where(eq(templateGroupsTable.templateId, templateId));
  }
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
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Thêm mới case
      //-----------------------------------------------------------------
      const [newCase] = await tx
        .insert(casesTable)
        .values({
          ...reqDto,
        })
        .returning();

      //----------------------------------------------------------------
      // 2. If not fields, return newCase
      //-----------------------------------------------------------------
      if (!reqDto.fields?.length) return newCase;

      // 2️⃣ Lấy group theo template
      const templateGroups = await this.getTemplateGroups(reqDto.templateId);
      if (!templateGroups.length) return newCase;
      // 3️⃣ Tạo group trong case_groups
      const caseGroupsToInsert = templateGroups.map((g) => ({
        caseId: newCase.id,
        // groupId: g.id,
        title: g.title,
        description: g.description,
      }));
      const insertedCaseGroups = await tx
        .insert(caseGroupsTable)
        .values(caseGroupsToInsert)
        .returning();
      console.log('Inserted Case Groups:', insertedCaseGroups);
      const groupMap = new Map(
        insertedCaseGroups.map((g) => [g.groupId, g.id]),
      );

      //----------------------------------------------------------------
      // 3. Lấy danh sách field từ template
      //-----------------------------------------------------------------
      // 4️⃣ Lấy field theo template (kèm groupId)
      const templateFields = await this.getTemplateFields(reqDto.templateId);
      if (!templateFields.length) return newCase;

      const fieldMap = new Map(
        templateFields.map((f) => [
          f.fieldName,
          { fieldId: f.fieldId, groupId: f.groupId, fieldLabel: f.fieldLabel },
        ]),
      );
      console.log('Field Map:', fieldMap);
      // 3. Insert vào bảng caseFields
      // 5️⃣ Lọc và tạo dữ liệu cho caseFields
      const caseFieldValues =
        reqDto.fields
          ?.filter((f) => fieldMap.has(f.fieldName))
          .map((f) => {
            const { fieldId, groupId, fieldLabel } = fieldMap.get(f.fieldName)!;
            return {
              caseId: newCase.id,
              groupId: groupMap.get(groupId)!,
              fieldId,
              fieldLabel: fieldLabel || '',
              fieldName: f.fieldName,
              fieldValue: f.value || '',
            };
          }) ?? [];
      if (caseFieldValues.length) {
        await tx.insert(caseFieldsTable).values(caseFieldValues);
      }

      return newCase;
    });
  }

  async getPageCases(reqDto: PageUserReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.casesTable> = {
      with: {
        template: true,
        assignee: true,
      },
    };

    const qCount = this.db.query.casesTable.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.casesTable.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(casesTable.createdAt)]
            : [desc(casesTable.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getCaseById(caseId: string) {
    const caseItem = await this.db.query.casesTable.findFirst({
      where: eq(casesTable.id, caseId),
      with: {
        assignee: true,
      },
    });
    if (!caseItem) {
      throw new ValidationException(ErrorCode.C001);
    }
    return caseItem;
  }

  async addPhaseToCase(caseId: string, reqDto: CreatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra case có tồn tại không
      //-----------------------------------------------------------------
      const [caseFound] = await tx
        .select({ id: casesTable.id })
        .from(casesTable)
        .where(eq(casesTable.id, caseId));
      if (!caseFound) {
        throw new ValidationException(ErrorCode.C001);
      }
      //----------------------------------------------------------------
      // 2. Thêm mới phase
      //-----------------------------------------------------------------
      // Thêm danh sách phases mới vào case
      const [insertedPhases] = await tx
        .insert(casePhasesTable)
        .values({
          ...reqDto,
          // cover [{ task: 'task 1' }, { task: 'task 2'}] => ['task 1', 'task 2']
          tasks: reqDto.tasks?.map((t) => t.name) || [],
          caseId,
        })
        .returning();
      return insertedPhases;
    });
  }

  async getPhasesByCaseId(caseId: string) {
    return this.db.query.casePhasesTable.findMany({
      where: eq(casePhasesTable.caseId, caseId),
      orderBy: [desc(casePhasesTable.order)],
    });
  }

  async updatePhaseById(phaseId: string, reqDto: CreatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra phase có tồn tại không
      //-----------------------------------------------------------------
      const [phaseFound] = await tx
        .select({ id: casePhasesTable.id })
        .from(casePhasesTable)
        .where(eq(casePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.P001);
      }
      //----------------------------------------------------------------
      // 2. Cập nhật phase
      //-----------------------------------------------------------------
      const [updatedPhase] = await tx
        .update(casePhasesTable)
        .set({
          ...reqDto,
          tasks: reqDto.tasks?.map((t) => t.name) || [],
        })
        .where(eq(casePhasesTable.id, phaseId))
        .returning();
      return updatedPhase;
    });
  }
}
