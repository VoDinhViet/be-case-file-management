import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { ErrorCode } from '../../constants/error-code.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  templateFieldsTable,
  templateGroupsTable,
  templatesTable,
} from '../../database/schemas';
import type {
  DrizzleDB,
  FindManyQueryConfig,
} from '../../database/types/drizzle';
import { ValidationException } from '../../exceptions/validation.exception';
import { CreateTemplateReqDto } from './dto/create-template.req.dto';
import { PageTemplateReqDto } from './dto/page-template.req.dto';
import { UpdateTemplateReqDto } from './dto/update-template.req.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async existByTemplateTitle(title: string) {
    return this.db.query.templatesTable.findFirst({
      where: eq(templatesTable.title, title),
      columns: { id: true },
    });
  }
  async createTemplates(reqDto: CreateTemplateReqDto) {
    console.log(
      'Creating template with data:',
      JSON.stringify(reqDto, null, 2),
    );
    return this.db.transaction(async (trx) => {
      // 1. Insert template
      if (await this.existByTemplateTitle(reqDto.title)) {
        throw new ValidationException(ErrorCode.T003);
      }
      const [createdTemplate] = await trx
        .insert(templatesTable)
        .values({
          title: reqDto.title,
          description: reqDto.description,
        })
        .returning();

      // 2. Insert groups + fields
      if (reqDto.groups && reqDto.groups.length > 0) {
        for (const group of reqDto.groups) {
          const [createdGroup] = await trx
            .insert(templateGroupsTable)
            .values({
              templateId: createdTemplate.id,
              ...group,
            })
            .returning();

          // 3. Insert fields trong group
          if (group.fields && group.fields.length > 0) {
            await trx.insert(templateFieldsTable).values(
              group.fields.map((field) => ({
                groupId: createdGroup.id,
                ...field,
              })),
            );
          }
        }
      }

      // 4. Return kết quả
      return createdTemplate;
    });
  }

  async getPageTemplates(reqDto: PageTemplateReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.templatesTable> =
      {
        where: and(
          or(
            ...(reqDto.q
              ? [
                  sql`unaccent(${templatesTable.title}) ILIKE unaccent(${`%${reqDto.q}%`})`,
                  sql`unaccent(${templatesTable.description}) ILIKE unaccent(${`%${reqDto.q}%`})`,
                ]
              : []),
          ),
        ),
        with: {
          groups: {
            with: {
              fields: true,
            },
          },
        },
      };
    const qCount = this.db.query.templatesTable.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.templatesTable.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(templatesTable.createdAt)]
            : [desc(templatesTable.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async getTemplateById(templateId: string) {
    const template = await this.db.query.templatesTable.findFirst({
      where: eq(templatesTable.id, templateId),
      with: {
        groups: {
          orderBy: [asc(templateGroupsTable.index)],
          with: {
            fields: {
              orderBy: [asc(templateFieldsTable.index)],
            },
          },
        },
      },
    });
    if (!template) {
      throw new ValidationException(ErrorCode.T001);
    }
    return template;
  }

  async updateTemplate(templateId: string, reqDto: UpdateTemplateReqDto) {
    return this.db.transaction(async (tx) => {
      const template = await tx.query.templatesTable.findFirst({
        where: eq(templatesTable.id, templateId),
        with: {
          groups: { with: { fields: true } },
        },
      });
      if (!template) throw new ValidationException(ErrorCode.T001);

      // Update template info
      await tx
        .update(templatesTable)
        .set({
          ...reqDto,
        })
        .where(eq(templatesTable.id, templateId));

      const existingGroups = template.groups;

      // --- Duyệt qua group từ client ---
      for (const groupDto of reqDto.groups) {
        let groupId = groupDto.id;

        // 🔹 Nếu có id → update
        if (groupId) {
          await tx
            .update(templateGroupsTable)
            .set({
              ...groupDto,
            })
            .where(eq(templateGroupsTable.id, groupId));
        } else {
          // 🔹 Nếu không có id → insert mới
          const [newGroup] = await tx
            .insert(templateGroupsTable)
            .values({
              templateId,
              title: groupDto.title,
              description: groupDto.description,
              index: groupDto.index,
              isEdit: groupDto.isEdit ?? true,
            })
            .returning({ id: templateGroupsTable.id });
          groupId = newGroup.id;
        }

        const existingFields =
          existingGroups.find((g) => g.id === groupId)?.fields ?? [];

        // --- So sánh fields ---
        const existingFieldIds = new Set(existingFields.map((f) => f.id));
        const incomingFieldIds = new Set(
          groupDto.fields.map((f) => f.id).filter(Boolean),
        );

        // 🔸 Xóa field không còn tồn tại
        const toDelete = [...existingFieldIds].filter(
          (id) => !incomingFieldIds.has(id),
        );
        if (toDelete.length)
          await tx
            .delete(templateFieldsTable)
            .where(inArray(templateFieldsTable.id, toDelete));

        // 🔸 Thêm hoặc cập nhật field
        for (const f of groupDto.fields) {
          if (f.id) {
            await tx
              .update(templateFieldsTable)
              .set({
                ...f,
                // fieldLabel: f.fieldLabel,
                // fieldName: f.fieldName,
                // fieldType: f.fieldType,
                // isRequired: f.isRequired ?? false,
                // placeholder: f.placeholder,
                // options: f.options ?? [],
                // defaultValue: f.defaultValue,
                // isEdit: f.isEdit ?? true,
                // index: f.index,
                // description: f.description,
              })
              .where(eq(templateFieldsTable.id, f.id));
          } else {
            await tx.insert(templateFieldsTable).values({
              groupId,
              ...f,
              // fieldLabel: f.fieldLabel,
              // fieldName: f.fieldName,
              // fieldType: f.fieldType,
              // isRequired: f.isRequired ?? false,
              // placeholder: f.placeholder,
              // options: f.options ?? [],
              // defaultValue: f.defaultValue,
              // isEdit: f.isEdit ?? true,
              // index: f.index,
              // description: f.description,
            });
          }
        }
      }

      // --- Xóa group bị bỏ ---
      const incomingGroupIds = new Set(
        reqDto.groups.map((g) => g.id).filter(Boolean),
      );
      const toDeleteGroups = existingGroups
        .map((g) => g.id)
        .filter((id) => !incomingGroupIds.has(id));

      if (toDeleteGroups.length) {
        await tx
          .delete(templateGroupsTable)
          .where(inArray(templateGroupsTable.id, toDeleteGroups));
      }

      return tx.query.templatesTable.findFirst({
        where: eq(templatesTable.id, templateId),
        with: { groups: { with: { fields: true } } },
      });
    });
  }

  async deleteTemplate(templateId: string) {
    const template = await this.db.query.templatesTable.findFirst({
      where: eq(templatesTable.id, templateId),
      columns: { id: true },
    });
    if (!template) throw new ValidationException(ErrorCode.T001);

    return this.db
      .delete(templatesTable)
      .where(eq(templatesTable.id, templateId));
  }
}
