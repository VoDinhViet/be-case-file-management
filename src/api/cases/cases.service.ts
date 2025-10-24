import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { ErrorCode } from '../../constants/error-code.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  caseFieldsTable,
  caseGroupsTable,
  casePhasesTable,
  casePlansTable,
  casesTable,
  templateFieldsTable,
  templateGroupsTable,
  templatesTable,
  usersTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { ValidationException } from '../../exceptions/validation.exception';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { RoleEnum } from '../auth/types/role.enum';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CreateCaseDto } from './dto/create-case.req.dto';
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';
import { UpdateCaseReqDto } from './dto/update-case.req.dto';
import { UpdatePhasesReqDto } from './dto/update-phases.req.dto';
import { UpsertPlanReqDto } from './dto/upsert-plan.req.dto';

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
      const caseInsert: typeof casesTable.$inferInsert = {
        templateId: reqDto.templateId,
        applicableLaw: reqDto.applicableLaw,
        numberOfDefendants: reqDto.numberOfDefendants,
        crimeType: reqDto.crimeType,
        name: reqDto.name,
        status: reqDto.status,
        description: reqDto.description,
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

  async getPageCases(reqDto: PageUserReqDto, payload: JwtPayloadType) {
    // Subquery để tính startDate và endDate từ phases
    const phaseDatesSubquery = this.db
      .select({
        caseId: casePhasesTable.caseId,
        minStartDate: sql<Date>`MIN(${casePhasesTable.startDate})`
          .mapWith((val) => (val ? new Date(val) : null))
          .as('min_start_date'),
        maxEndDate:
          sql<Date>`MAX(COALESCE(${casePhasesTable.completedAt}, ${casePhasesTable.endDate}))`
            .mapWith((val) => (val ? new Date(val) : null))
            .as('max_end_date'),
      })
      .from(casePhasesTable)
      .groupBy(casePhasesTable.caseId)
      .as('phase_dates');

    // Build WHERE conditions
    const whereConditions = and(
      ...(reqDto.q
        ? [
            or(
              sql`unaccent(${casesTable.name}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${casesTable.description}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${casesTable.crimeType}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${casesTable.applicableLaw}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`CAST(${casesTable.numberOfDefendants} AS TEXT) ILIKE ${`%${reqDto.q}%`}`,
            ),
          ]
        : []),
      ...(payload.role !== RoleEnum.ADMIN
        ? [eq(casesTable.userId, payload.id)]
        : []),
    );

    // Query chính với LEFT JOIN subquery, template, và assignee
    const [entities, [{ totalCount }]] = await Promise.all([
      this.db
        .select({
          // Case fields
          id: casesTable.id,
          name: casesTable.name,
          status: casesTable.status,
          description: casesTable.description,
          crimeType: casesTable.crimeType,
          applicableLaw: casesTable.applicableLaw,
          numberOfDefendants: casesTable.numberOfDefendants,
          userId: casesTable.userId,
          templateId: casesTable.templateId,
          createdAt: casesTable.createdAt,
          updatedAt: casesTable.updatedAt,
          // Computed dates từ phases
          startDate: phaseDatesSubquery.minStartDate,
          endDate: phaseDatesSubquery.maxEndDate,
          // Template relation
          template: templatesTable,
          // Assignee relation
          assignee: usersTable,
        })
        .from(casesTable)
        .leftJoin(
          phaseDatesSubquery,
          eq(casesTable.id, phaseDatesSubquery.caseId),
        )
        .leftJoin(templatesTable, eq(casesTable.templateId, templatesTable.id))
        .leftJoin(usersTable, eq(casesTable.userId, usersTable.id))
        .where(whereConditions)
        .orderBy(
          reqDto.order === Order.DESC
            ? desc(casesTable.createdAt)
            : asc(casesTable.createdAt),
        )
        .limit(reqDto.limit)
        .offset(reqDto.offset),
      this.db
        .select({ totalCount: count() })
        .from(casesTable)
        .where(whereConditions),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getCaseById(caseId: string) {
    // Subquery để tính startDate và endDate từ phases
    const phaseDatesSubquery = this.db
      .select({
        caseId: casePhasesTable.caseId,
        minStartDate: sql<Date>`MIN(${casePhasesTable.startDate})`
          .mapWith((val) => (val ? new Date(val) : null))
          .as('min_start_date'),
        maxEndDate:
          sql<Date>`MAX(COALESCE(${casePhasesTable.completedAt}, ${casePhasesTable.endDate}))`
            .mapWith((val) => (val ? new Date(val) : null))
            .as('max_end_date'),
      })
      .from(casePhasesTable)
      .where(eq(casePhasesTable.caseId, caseId))
      .groupBy(casePhasesTable.caseId)
      .as('phase_dates');

    // Query chính với LEFT JOIN
    const [caseWithDates] = await this.db
      .select({
        // Case fields
        id: casesTable.id,
        name: casesTable.name,
        status: casesTable.status,
        description: casesTable.description,
        crimeType: casesTable.crimeType,
        applicableLaw: casesTable.applicableLaw,
        numberOfDefendants: casesTable.numberOfDefendants,
        userId: casesTable.userId,
        templateId: casesTable.templateId,
        createdAt: casesTable.createdAt,
        updatedAt: casesTable.updatedAt,
        // Computed dates từ phases
        startDate: phaseDatesSubquery.minStartDate,
        endDate: phaseDatesSubquery.maxEndDate,
        // Relations
        template: templatesTable,
        assignee: usersTable,
      })
      .from(casesTable)
      .leftJoin(
        phaseDatesSubquery,
        eq(casesTable.id, phaseDatesSubquery.caseId),
      )
      .leftJoin(templatesTable, eq(casesTable.templateId, templatesTable.id))
      .leftJoin(usersTable, eq(casesTable.userId, usersTable.id))
      .where(eq(casesTable.id, caseId));

    if (!caseWithDates) {
      throw new ValidationException(ErrorCode.C001);
    }

    // Lấy groups và fields
    const groups = await this.db.query.caseGroupsTable.findMany({
      where: eq(caseGroupsTable.caseId, caseId),
      with: {
        fields: true,
      },
    });

    // Lấy phases
    const phases = await this.db.query.casePhasesTable.findMany({
      where: eq(casePhasesTable.caseId, caseId),
      orderBy: [asc(casePhasesTable.order)],
    });

    return {
      ...caseWithDates,
      groups,
      phases,
    };
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
      // 2. Validate ngày tháng
      //-----------------------------------------------------------------
      if (new Date(reqDto.startDate) > new Date(reqDto.endDate)) {
        throw new ValidationException(
          ErrorCode.V000,
          'startDate must be less than or equal to endDate',
        );
      }

      //----------------------------------------------------------------
      // 3. Thêm mới phase
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
          startDate: casePhasesTable.startDate,
          endDate: casePhasesTable.endDate,
        })
        .from(casePhasesTable)
        .where(eq(casePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.P001);
      }

      //----------------------------------------------------------------
      // 2. Validate ngày tháng
      //-----------------------------------------------------------------
      const finalStartDate = reqDto.startDate || phaseFound.startDate;
      const finalEndDate = reqDto.endDate || phaseFound.endDate;

      if (new Date(finalStartDate) > new Date(finalEndDate)) {
        throw new ValidationException(
          ErrorCode.V000,
          'startDate must be less than or equal to endDate',
        );
      }

      //----------------------------------------------------------------
      // 3. Cập nhật phase
      //-----------------------------------------------------------------
      const updateData: Partial<typeof casePhasesTable.$inferInsert> = {
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
          startDate: casePhasesTable.startDate,
          endDate: casePhasesTable.endDate,
        })
        .from(casePhasesTable)
        .where(eq(casePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.P001);
      }

      //----------------------------------------------------------------
      // 2. Validate ngày tháng
      //-----------------------------------------------------------------
      const finalStartDate = reqDto.startDate || phaseFound.startDate;
      const finalEndDate = reqDto.endDate || phaseFound.endDate;

      if (new Date(finalStartDate) > new Date(finalEndDate)) {
        throw new ValidationException(
          ErrorCode.V000,
          'startDate must be less than or equal to endDate',
        );
      }

      //----------------------------------------------------------------
      // 3. Cập nhật phases
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

  async deletePhaseById(phaseId: string) {
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
      // 2. Xóa phase
      //-----------------------------------------------------------------
      await tx.delete(casePhasesTable).where(eq(casePhasesTable.id, phaseId));
      return { success: true };
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

      const [updatedCase] = await tx
        .update(casesTable)
        .set({
          ...reqDto,
        })
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

  async deleteCaseById(caseId: string, payload: JwtPayloadType) {
    return this.db.transaction(async (tx) => {
      // Check exists and permission (owner or admin)
      const [caseFound] = await tx
        .select({ userId: casesTable.userId, id: casesTable.id })
        .from(casesTable)
        .where(eq(casesTable.id, caseId));
      if (!caseFound) {
        throw new ValidationException(ErrorCode.C001);
      }

      if (payload.role !== RoleEnum.ADMIN && caseFound.userId !== payload.id) {
        throw new ValidationException(
          ErrorCode.V000,
          'You do not have permission to delete this case',
        );
      }

      await tx.delete(casesTable).where(eq(casesTable.id, caseId));
      return { success: true };
    });
  }

  // ==================== CASE PLANS METHODS ====================

  async upsertPlanForCase(caseId: string, reqDto: UpsertPlanReqDto) {
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
      // 2. Kiểm tra plan đã tồn tại chưa
      //-----------------------------------------------------------------
      const [existingPlan] = await tx
        .select({ id: casePlansTable.id })
        .from(casePlansTable)
        .where(eq(casePlansTable.caseId, caseId));

      //----------------------------------------------------------------
      // 3. Tạo hoặc cập nhật plan
      //-----------------------------------------------------------------
      const planData: Partial<typeof casePlansTable.$inferInsert> = {
        investigationResult: reqDto.investigationResult,
        exhibits: reqDto.exhibits || [],
        nextInvestigationPurpose: reqDto.nextInvestigationPurpose,
        nextInvestigationContent: reqDto.nextInvestigationContent || [],
        participatingForces: reqDto.participatingForces || [],
        startDate: reqDto.startDate,
        endDate: reqDto.endDate,
        budget: reqDto.budget,
      };

      if (existingPlan) {
        // Update
        const [updatedPlan] = await tx
          .update(casePlansTable)
          .set({
            ...planData,
          })
          .where(eq(casePlansTable.id, existingPlan.id))
          .returning();
        return updatedPlan;
      } else {
        // Create
        const [insertedPlan] = await tx
          .insert(casePlansTable)
          .values({
            caseId,
            ...planData,
          })
          .returning();
        return insertedPlan;
      }
    });
  }

  async getPlanByCaseId(caseId: string) {
    return this.db.query.casePlansTable.findFirst({
      where: eq(casePlansTable.caseId, caseId),
    });
  }
}
