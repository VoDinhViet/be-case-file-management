import { Inject, Injectable } from '@nestjs/common';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
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
import { UpdateCaseReqDto } from './dto/update-case.req.dto';
import { UpdatePhasesReqDto } from './dto/update-phases.req.dto';

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
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1️⃣ Thêm mới case
      //----------------------------------------------------------------
      // 1.1 Validate ngày tháng
      if (reqDto.endDate && reqDto.startDate) {
        if (new Date(reqDto.endDate) < new Date(reqDto.startDate)) {
          throw new ValidationException(
            ErrorCode.V000,
            'endDate must be greater than or equal to startDate',
          );
        }
      }

      const caseInsert: typeof casesTable.$inferInsert = {
        templateId: reqDto.templateId,
        applicableLaw: reqDto.applicableLaw,
        numberOfDefendants: reqDto.numberOfDefendants,
        crimeType: reqDto.crimeType,
        name: reqDto.name,
        status: reqDto.status,
        description: reqDto.description,
        startDate: reqDto.startDate,
        endDate: reqDto.endDate,
        userId: reqDto.userId,
      };

      const [newCase] = await tx
        .insert(casesTable)
        .values(caseInsert)
        .returning();

      //----------------------------------------------------------------
      // 2️⃣ Nếu không có fields, return ngay newCase
      //----------------------------------------------------------------
      if (!reqDto.fields?.length) return newCase;

      //----------------------------------------------------------------
      // 3️⃣ Lấy group theo template
      //----------------------------------------------------------------
      const templateGroups = await this.getTemplateGroups(reqDto.templateId);
      if (!templateGroups.length) return newCase;

      //----------------------------------------------------------------
      // 4️⃣ Tạo group trong case_groups, lưu cả templateGroupId
      //----------------------------------------------------------------
      const caseGroupsToInsert = templateGroups.map((g) => ({
        caseId: newCase.id,
        groupId: g.id, // giữ id gốc của template
        title: g.title,
        description: g.description,
      }));

      const insertedCaseGroups = await tx
        .insert(caseGroupsTable)
        .values(caseGroupsToInsert)
        .returning();

      // Map templateGroupId -> new caseGroup.id
      const groupMap = new Map(
        insertedCaseGroups.map((g) => [g.groupId, g.id]),
      );

      //----------------------------------------------------------------
      // 5️⃣ Lấy danh sách field từ template
      //----------------------------------------------------------------
      const templateFields = await this.getTemplateFields(reqDto.templateId);
      if (!templateFields.length) return newCase;

      // Map fieldName -> template meta for defaulting case_fields values
      const fieldMap = new Map(
        templateFields.map((f) => [
          f.fieldName,
          {
            groupId: f.groupId,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            placeholder: f.placeholder,
            options: f.options,
            defaultValue: f.defaultValue,
            isEdit: f.isEdit,
            description: f.description,
          },
        ]),
      );

      //----------------------------------------------------------------
      // 6️⃣ Tạo dữ liệu cho caseFields
      //----------------------------------------------------------------
      const caseFieldValues: (typeof caseFieldsTable.$inferInsert)[] =
        reqDto.fields
          ?.filter((f) => fieldMap.has(f.fieldName))
          .map((f) => {
            const meta = fieldMap.get(f.fieldName)!;
            const templateGroupId = meta.groupId;
            const row: typeof caseFieldsTable.$inferInsert = {
              caseId: newCase.id,
              groupId: groupMap.get(templateGroupId)!, // lấy id từ map
              fieldLabel: f.fieldLabel ?? meta.fieldLabel ?? '',
              fieldName: f.fieldName,
              fieldType: f.fieldType ?? meta.fieldType ?? 'text',
              fieldValue: f.value || '',
              isRequired: f.isRequired ?? meta.isRequired ?? false,
              placeholder: f.placeholder ?? meta.placeholder,
              defaultValue: f.defaultValue ?? meta.defaultValue,
              isEditable: f.isEdit ?? meta.isEdit ?? true,
              description: f.description ?? meta.description,
            };
            return row;
          }) ?? [];

      if (caseFieldValues.length) {
        await tx.insert(caseFieldsTable).values(caseFieldValues);
      }

      //----------------------------------------------------------------
      // 7️⃣ Return case mới tạo
      //----------------------------------------------------------------
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
        groups: {
          with: {
            fields: true,
          },
        },
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
      orderBy: [asc(casePhasesTable.order)],
    });
  }

  async updatePhaseById(phaseId: string, reqDto: UpdatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra phase có tồn tại không
      //-----------------------------------------------------------------
      const [phaseFound] = await tx
        .select({
          id: casePhasesTable.id,
          isCompleted: casePhasesTable.isCompleted,
        })
        .from(casePhasesTable)
        .where(eq(casePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.P001);
      }
      //----------------------------------------------------------------
      // 2. Cập nhật phase
      //-----------------------------------------------------------------
      const updateData = {
        ...reqDto,
        tasks: reqDto.tasks?.map((t) => t.name) || [],
      };

      // Tự động set completedAt khi phase được đánh dấu hoàn thành
      if (reqDto.isCompleted === true && !phaseFound.isCompleted) {
        updateData.completedAt = new Date();
      }
      // Xóa completedAt nếu phase được đánh dấu chưa hoàn thành
      if (reqDto.isCompleted === false) {
        updateData.completedAt = null;
      }

      const [updatedPhase] = await tx
        .update(casePhasesTable)
        .set(updateData)
        .where(eq(casePhasesTable.id, phaseId))
        .returning();
      return updatedPhase;
    });
  }

  async updatePhasesByCaseId(phaseId: string, reqDto: UpdatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra phase có tồn tại không
      //-----------------------------------------------------------------
      const [phaseFound] = await tx
        .select({
          id: casePhasesTable.id,
          isCompleted: casePhasesTable.isCompleted,
        })
        .from(casePhasesTable)
        .where(eq(casePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.P001);
      }
      //----------------------------------------------------------------
      // 2. Cập nhật phases
      //-----------------------------------------------------------------
      const updateData: Partial<typeof casePhasesTable.$inferInsert> = {
        ...reqDto,
        ...(reqDto.tasks && {
          tasks: reqDto.tasks?.map((t) => t.name) || [],
        }),
      };

      // Tự động set completedAt khi phase được đánh dấu hoàn thành
      if (reqDto.isCompleted === true && !phaseFound.isCompleted) {
        updateData.completedAt = new Date();
      }
      // Xóa completedAt nếu phase được đánh dấu chưa hoàn thành
      if (reqDto.isCompleted === false) {
        updateData.completedAt = null;
      }

      const [updatedPhases] = await tx
        .update(casePhasesTable)
        .set(updateData)
        .where(eq(casePhasesTable.id, phaseId))
        .returning();
      return updatedPhases;
    });
  }

  async updateCaseById(caseId: string, reqDto: UpdateCaseReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1️⃣ Kiểm tra case có tồn tại không
      //----------------------------------------------------------------
      const [caseFound] = await tx
        .select({ id: casesTable.id })
        .from(casesTable)
        .where(eq(casesTable.id, caseId));
      if (!caseFound) {
        throw new ValidationException(ErrorCode.C001);
      }

      //----------------------------------------------------------------
      // 2️⃣ Cập nhật case (chỉ các field cơ bản, bỏ qua groups)
      //----------------------------------------------------------------
      const baseUpdate: Partial<typeof casesTable.$inferInsert> = {};
      if (reqDto.status !== undefined) baseUpdate.status = reqDto.status;

      const [updatedCase] = await tx
        .update(casesTable)
        .set(baseUpdate)
        .where(eq(casesTable.id, caseId))
        .returning();

      //----------------------------------------------------------------
      // 3️⃣ Cập nhật groups và fields nếu có
      //----------------------------------------------------------------
      if (reqDto.groups?.length) {
        for (const g of reqDto.groups) {
          if (!g.id) continue; // chỉ hỗ trợ update nhóm đã tồn tại

          const groupUpdate: Partial<typeof caseGroupsTable.$inferInsert> = {};
          if (g.title !== undefined) groupUpdate.title = g.title;
          if (g.description !== undefined)
            groupUpdate.description = g.description;
          if (g.index !== undefined) groupUpdate.index = g.index;

          if (Object.keys(groupUpdate).length) {
            await tx
              .update(caseGroupsTable)
              .set(groupUpdate)
              .where(eq(caseGroupsTable.id, g.id));
          }

          if (g.fields?.length) {
            for (const f of g.fields) {
              if (!f.id) continue; // chỉ hỗ trợ update field đã tồn tại
              const fieldUpdate: Partial<typeof caseFieldsTable.$inferInsert> =
                {};
              if (f.fieldLabel !== undefined)
                fieldUpdate.fieldLabel = f.fieldLabel;
              if (f.fieldValue !== undefined)
                fieldUpdate.fieldValue = f.fieldValue;
              if (f.placeholder !== undefined)
                fieldUpdate.placeholder = f.placeholder;
              if (f.defaultValue !== undefined)
                fieldUpdate.defaultValue = f.defaultValue;
              if (f.description !== undefined)
                fieldUpdate.description = f.description;
              if (f.isRequired !== undefined)
                fieldUpdate.isRequired = f.isRequired;
              if (f.isEditable !== undefined)
                fieldUpdate.isEditable = f.isEditable;
              if (f.index !== undefined) fieldUpdate.index = f.index;
              if (f.options !== undefined) fieldUpdate.options = f.options;

              if (Object.keys(fieldUpdate).length) {
                await tx
                  .update(caseFieldsTable)
                  .set(fieldUpdate)
                  .where(eq(caseFieldsTable.id, f.id));
              }
            }
          }
        }
      }

      return updatedCase;
    });
  }
}
