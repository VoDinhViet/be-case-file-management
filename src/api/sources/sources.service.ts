import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { ErrorCode } from '../../constants/error-code.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  sourceFieldsTable,
  sourceGroupsTable,
  sourcePhasesTable,
  sourcePlansTable,
  sourcesTable,
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
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';
import { CreateSourceDto } from './dto/create-source.req.dto';
import { UpdatePhasesReqDto } from './dto/update-phases.req.dto';
import { UpdateSourceReqDto } from './dto/update-source.req.dto';
import { UpsertPlanReqDto } from './dto/upsert-plan.req.dto';

@Injectable()
export class SourcesService {
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
  async createSource(reqDto: CreateSourceDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1️⃣ Thêm mới source
      //----------------------------------------------------------------
      const sourceInsert: typeof sourcesTable.$inferInsert = {
        templateId: reqDto.templateId,
        applicableLaw: reqDto.applicableLaw,
        numberOfDefendants: reqDto.numberOfDefendants,
        crimeType: reqDto.crimeType,
        name: reqDto.name,
        status: reqDto.status,
        description: reqDto.description,
        userId: reqDto.userId,
      };

      const [newSource] = await tx
        .insert(sourcesTable)
        .values(sourceInsert)
        .returning();

      //----------------------------------------------------------------
      // 2️⃣ Nếu không có fields, return ngay newSource
      //----------------------------------------------------------------
      if (!reqDto.fields?.length) return newSource;

      //----------------------------------------------------------------
      // 3️⃣ Lấy group theo template
      //----------------------------------------------------------------
      const templateGroups = await this.getTemplateGroups(reqDto.templateId);
      if (!templateGroups.length) return newSource;

      //----------------------------------------------------------------
      // 4️⃣ Tạo group trong source_groups, lưu cả templateGroupId
      //----------------------------------------------------------------
      const sourceGroupsToInsert = templateGroups.map((g) => ({
        sourceId: newSource.id,
        groupId: g.id, // giữ id gốc của template
        title: g.title,
        description: g.description,
      }));

      const insertedSourceGroups = await tx
        .insert(sourceGroupsTable)
        .values(sourceGroupsToInsert)
        .returning();

      // Map templateGroupId -> new sourceGroup.id
      const groupMap = new Map(
        insertedSourceGroups.map((g) => [g.groupId, g.id]),
      );

      //----------------------------------------------------------------
      // 5️⃣ Lấy danh sách field từ template
      //----------------------------------------------------------------
      const templateFields = await this.getTemplateFields(reqDto.templateId);
      if (!templateFields.length) return newSource;

      // Map fieldName -> template meta for defaulting source_fields values
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
      // 6️⃣ Tạo dữ liệu cho sourceFields
      //----------------------------------------------------------------
      const sourceFieldValues: (typeof sourceFieldsTable.$inferInsert)[] =
        reqDto.fields
          ?.filter((f) => fieldMap.has(f.fieldName))
          .map((f) => {
            const meta = fieldMap.get(f.fieldName)!;
            const templateGroupId = meta.groupId;
            const row: typeof sourceFieldsTable.$inferInsert = {
              sourceId: newSource.id,
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

      if (sourceFieldValues.length) {
        await tx.insert(sourceFieldsTable).values(sourceFieldValues);
      }

      //----------------------------------------------------------------
      // 7️⃣ Return source mới tạo
      //----------------------------------------------------------------
      return newSource;
    });
  }

  async getPageSources(reqDto: PageUserReqDto, payload: JwtPayloadType) {
    // Subquery để tính startDate và endDate từ phases
    const phaseDatesSubquery = this.db
      .select({
        sourceId: sourcePhasesTable.sourceId,
        minStartDate: sql<Date>`MIN(${sourcePhasesTable.startDate})`
          .mapWith((val) => (val ? new Date(val) : null))
          .as('min_start_date'),
        maxEndDate:
          sql<Date>`MAX(COALESCE(${sourcePhasesTable.completedAt}, ${sourcePhasesTable.endDate}))`
            .mapWith((val) => (val ? new Date(val) : null))
            .as('max_end_date'),
      })
      .from(sourcePhasesTable)
      .groupBy(sourcePhasesTable.sourceId)
      .as('phase_dates');

    // Subquery để kiểm tra xem source có phases hay không
    const phaseCheckSubquery = this.db
      .select({
        sourceId: sourcePhasesTable.sourceId,
        hasPhases: sql<boolean>`COUNT(*) > 0`.as('has_phases'),
      })
      .from(sourcePhasesTable)
      .groupBy(sourcePhasesTable.sourceId)
      .as('phase_check');

    // Build WHERE conditions
    const whereConditions = and(
      ...(reqDto.q
        ? [
            or(
              sql`unaccent(${sourcesTable.name}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${sourcesTable.description}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${sourcesTable.crimeType}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`unaccent(${sourcesTable.applicableLaw}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              sql`CAST(${sourcesTable.numberOfDefendants} AS TEXT) ILIKE ${`%${reqDto.q}%`}`,
            ),
          ]
        : []),
      ...(payload.role !== RoleEnum.ADMIN
        ? [eq(sourcesTable.userId, payload.id)]
        : []),
    );

    // Query chính với LEFT JOIN subquery, template, và assignee
    const [entities, [{ totalCount }]] = await Promise.all([
      this.db
        .select({
          // Source fields
          id: sourcesTable.id,
          name: sourcesTable.name,
          status: sourcesTable.status,
          description: sourcesTable.description,
          crimeType: sourcesTable.crimeType,
          applicableLaw: sourcesTable.applicableLaw,
          numberOfDefendants: sourcesTable.numberOfDefendants,
          userId: sourcesTable.userId,
          templateId: sourcesTable.templateId,
          createdAt: sourcesTable.createdAt,
          updatedAt: sourcesTable.updatedAt,
          // Computed dates từ phases
          startDate: phaseDatesSubquery.minStartDate,
          endDate: phaseDatesSubquery.maxEndDate,
          // Check field
          hasPhases: sql<boolean>`
            COALESCE(${phaseCheckSubquery.hasPhases}, false)
          `.as('hasPhases'),
          // Template relation
          template: templatesTable,
          // Assignee relation
          assignee: usersTable,
        })
        .from(sourcesTable)
        .leftJoin(
          phaseDatesSubquery,
          eq(sourcesTable.id, phaseDatesSubquery.sourceId),
        )
        .leftJoin(
          phaseCheckSubquery,
          eq(sourcesTable.id, phaseCheckSubquery.sourceId),
        )
        .leftJoin(
          templatesTable,
          eq(sourcesTable.templateId, templatesTable.id),
        )
        .leftJoin(usersTable, eq(sourcesTable.userId, usersTable.id))
        .where(whereConditions)
        .orderBy(
          reqDto.order === Order.DESC
            ? desc(sourcesTable.createdAt)
            : asc(sourcesTable.createdAt),
        )
        .limit(reqDto.limit)
        .offset(reqDto.offset),
      this.db
        .select({ totalCount: count() })
        .from(sourcesTable)
        .where(whereConditions),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getSourceById(sourceId: string) {
    // Subquery để tính startDate và endDate từ phases
    const phaseDatesSubquery = this.db
      .select({
        sourceId: sourcePhasesTable.sourceId,
        minStartDate: sql<Date>`MIN(${sourcePhasesTable.startDate})`
          .mapWith((val) => (val ? new Date(val) : null))
          .as('min_start_date'),
        maxEndDate:
          sql<Date>`MAX(COALESCE(${sourcePhasesTable.completedAt}, ${sourcePhasesTable.endDate}))`
            .mapWith((val) => (val ? new Date(val) : null))
            .as('max_end_date'),
      })
      .from(sourcePhasesTable)
      .where(eq(sourcePhasesTable.sourceId, sourceId))
      .groupBy(sourcePhasesTable.sourceId)
      .as('phase_dates');

    // Query chính với LEFT JOIN
    const [sourceWithDates] = await this.db
      .select({
        // Source fields
        id: sourcesTable.id,
        name: sourcesTable.name,
        status: sourcesTable.status,
        description: sourcesTable.description,
        crimeType: sourcesTable.crimeType,
        applicableLaw: sourcesTable.applicableLaw,
        numberOfDefendants: sourcesTable.numberOfDefendants,
        userId: sourcesTable.userId,
        templateId: sourcesTable.templateId,
        createdAt: sourcesTable.createdAt,
        updatedAt: sourcesTable.updatedAt,
        // Computed dates từ phases
        startDate: phaseDatesSubquery.minStartDate,
        endDate: phaseDatesSubquery.maxEndDate,
        // Relations
        template: templatesTable,
        assignee: usersTable,
      })
      .from(sourcesTable)
      .leftJoin(
        phaseDatesSubquery,
        eq(sourcesTable.id, phaseDatesSubquery.sourceId),
      )
      .leftJoin(templatesTable, eq(sourcesTable.templateId, templatesTable.id))
      .leftJoin(usersTable, eq(sourcesTable.userId, usersTable.id))
      .where(eq(sourcesTable.id, sourceId));

    if (!sourceWithDates) {
      throw new ValidationException(ErrorCode.S001);
    }

    // Lấy groups và fields
    const groups = await this.db.query.sourceGroupsTable.findMany({
      where: eq(sourceGroupsTable.sourceId, sourceId),
      with: {
        fields: true,
      },
    });

    // Lấy phases
    const phases = await this.db.query.sourcePhasesTable.findMany({
      where: eq(sourcePhasesTable.sourceId, sourceId),
      orderBy: [asc(sourcePhasesTable.order)],
    });

    return {
      ...sourceWithDates,
      groups,
      phases,
    };
  }

  async addPhaseToSource(sourceId: string, reqDto: CreatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra source có tồn tại không
      //-----------------------------------------------------------------
      const [sourceFound] = await tx
        .select({ id: sourcesTable.id })
        .from(sourcesTable)
        .where(eq(sourcesTable.id, sourceId));
      if (!sourceFound) {
        throw new ValidationException(ErrorCode.S001);
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
      // Thêm danh sách phases mới vào source
      const [insertedPhases] = await tx
        .insert(sourcePhasesTable)
        .values({
          ...reqDto,
          // cover [{ task: 'task 1' }, { task: 'task 2'}] => ['task 1', 'task 2']
          tasks: reqDto.tasks?.map((t) => t.name) || [],
          sourceId,
        })
        .returning();
      return insertedPhases;
    });
  }

  async getPhasesBySourceId(sourceId: string) {
    return this.db.query.sourcePhasesTable.findMany({
      where: eq(sourcePhasesTable.sourceId, sourceId),
      orderBy: [asc(sourcePhasesTable.order)],
    });
  }

  async updatePhaseById(phaseId: string, reqDto: UpdatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra phase có tồn tại không
      //-----------------------------------------------------------------
      const [phaseFound] = await tx
        .select({
          id: sourcePhasesTable.id,
          isCompleted: sourcePhasesTable.isCompleted,
          startDate: sourcePhasesTable.startDate,
          endDate: sourcePhasesTable.endDate,
        })
        .from(sourcePhasesTable)
        .where(eq(sourcePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.SP001);
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
      const updateData: Partial<typeof sourcePhasesTable.$inferInsert> = {
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
        .update(sourcePhasesTable)
        .set(updateData)
        .where(eq(sourcePhasesTable.id, phaseId))
        .returning();
      return updatedPhase;
    });
  }

  async updatePhasesBySourceId(phaseId: string, reqDto: UpdatePhasesReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra phase có tồn tại không
      //-----------------------------------------------------------------
      const [phaseFound] = await tx
        .select({
          id: sourcePhasesTable.id,
          isCompleted: sourcePhasesTable.isCompleted,
          startDate: sourcePhasesTable.startDate,
          endDate: sourcePhasesTable.endDate,
        })
        .from(sourcePhasesTable)
        .where(eq(sourcePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.SP001);
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
      const updateData: Partial<typeof sourcePhasesTable.$inferInsert> = {
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
        .update(sourcePhasesTable)
        .set(updateData)
        .where(eq(sourcePhasesTable.id, phaseId))
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
        .select({ id: sourcePhasesTable.id })
        .from(sourcePhasesTable)
        .where(eq(sourcePhasesTable.id, phaseId));
      if (!phaseFound) {
        throw new ValidationException(ErrorCode.SP001);
      }

      //----------------------------------------------------------------
      // 2. Xóa phase
      //-----------------------------------------------------------------
      await tx
        .delete(sourcePhasesTable)
        .where(eq(sourcePhasesTable.id, phaseId));
      return { success: true };
    });
  }

  async updateSourceById(sourceId: string, reqDto: UpdateSourceReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1️⃣ Kiểm tra source có tồn tại không
      //----------------------------------------------------------------
      const [sourceFound] = await tx
        .select({ id: sourcesTable.id })
        .from(sourcesTable)
        .where(eq(sourcesTable.id, sourceId));
      if (!sourceFound) {
        throw new ValidationException(ErrorCode.S001);
      }

      //----------------------------------------------------------------
      // 2. Kiểm tra user có tồn tại không
      //-----------------------------------------------------------------
      if (reqDto.userId) {
        const [userFound] = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.id, reqDto.userId));
        if (!userFound) {
          throw new ValidationException(ErrorCode.U001);
        }
      }

      //----------------------------------------------------------------
      // 2️⃣ Cập nhật source (chỉ các field cơ bản, bỏ qua groups)
      //----------------------------------------------------------------

      const [updatedSource] = await tx
        .update(sourcesTable)
        .set({
          ...reqDto,
        })
        .where(eq(sourcesTable.id, sourceId))
        .returning();

      //----------------------------------------------------------------
      // 3️⃣ Cập nhật groups và fields nếu có
      //----------------------------------------------------------------
      if (reqDto.groups?.length) {
        for (const g of reqDto.groups) {
          if (!g.id) continue; // chỉ hỗ trợ update nhóm đã tồn tại

          const groupUpdate: Partial<typeof sourceGroupsTable.$inferInsert> =
            {};
          if (g.title !== undefined) groupUpdate.title = g.title;
          if (g.description !== undefined)
            groupUpdate.description = g.description;
          if (g.index !== undefined) groupUpdate.index = g.index;

          if (Object.keys(groupUpdate).length) {
            await tx
              .update(sourceGroupsTable)
              .set(groupUpdate)
              .where(eq(sourceGroupsTable.id, g.id));
          }

          if (g.fields?.length) {
            for (const f of g.fields) {
              if (!f.id) continue; // chỉ hỗ trợ update field đã tồn tại
              const fieldUpdate: Partial<
                typeof sourceFieldsTable.$inferInsert
              > = {};
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
                  .update(sourceFieldsTable)
                  .set(fieldUpdate)
                  .where(eq(sourceFieldsTable.id, f.id));
              }
            }
          }
        }
      }

      return updatedSource;
    });
  }

  async deleteSourceById(sourceId: string, payload: JwtPayloadType) {
    return this.db.transaction(async (tx) => {
      // Check exists and permission (owner or admin)
      const [sourceFound] = await tx
        .select({ userId: sourcesTable.userId, id: sourcesTable.id })
        .from(sourcesTable)
        .where(eq(sourcesTable.id, sourceId));
      if (!sourceFound) {
        throw new ValidationException(ErrorCode.S001);
      }

      if (
        payload.role !== RoleEnum.ADMIN &&
        sourceFound.userId !== payload.id
      ) {
        throw new ValidationException(
          ErrorCode.V000,
          'You do not have permission to delete this source',
        );
      }

      await tx.delete(sourcesTable).where(eq(sourcesTable.id, sourceId));
      return { success: true };
    });
  }

  // ==================== SOURCE PLANS METHODS ====================

  async upsertPlanForSource(sourceId: string, reqDto: UpsertPlanReqDto) {
    return this.db.transaction(async (tx) => {
      //----------------------------------------------------------------
      // 1. Kiểm tra source có tồn tại không
      //-----------------------------------------------------------------
      const [sourceFound] = await tx
        .select({ id: sourcesTable.id })
        .from(sourcesTable)
        .where(eq(sourcesTable.id, sourceId));
      if (!sourceFound) {
        throw new ValidationException(ErrorCode.S001);
      }

      //----------------------------------------------------------------
      // 2. Kiểm tra plan đã tồn tại chưa
      //-----------------------------------------------------------------
      const [existingPlan] = await tx
        .select({ id: sourcePlansTable.id })
        .from(sourcePlansTable)
        .where(eq(sourcePlansTable.sourceId, sourceId));

      //----------------------------------------------------------------
      // 3. Tạo hoặc cập nhật plan
      //-----------------------------------------------------------------
      const planData: Partial<typeof sourcePlansTable.$inferInsert> = {
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
          .update(sourcePlansTable)
          .set({
            ...planData,
          })
          .where(eq(sourcePlansTable.id, existingPlan.id))
          .returning();
        return updatedPlan;
      } else {
        // Create
        const [insertedPlan] = await tx
          .insert(sourcePlansTable)
          .values({
            sourceId,
            ...planData,
          })
          .returning();
        return insertedPlan;
      }
    });
  }

  async getPlanBySourceId(sourceId: string) {
    return this.db.query.sourcePlansTable.findFirst({
      where: eq(sourcePlansTable.sourceId, sourceId),
    });
  }
}
