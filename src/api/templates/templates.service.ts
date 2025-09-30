import { Inject, Injectable } from '@nestjs/common';
import { count, desc, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { DRIZZLE } from '../../database/database.module';
import {
  templateFieldsTable,
  templateGroupsTable,
  templatesTable,
} from '../../database/schemas/templates.schema';
import type {
  DrizzleDB,
  FindManyQueryConfig,
} from '../../database/types/drizzle';
import { CreateTemplateReqDto } from './dto/create-template.req.dto';
import { PageTemplateReqDto } from './dto/page-template.req.dto';

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}
  async createTemplates(reqDto: CreateTemplateReqDto) {
    console.log('Creating template with data:', reqDto);
    return this.db.transaction(async (trx) => {
      // 1. Insert template
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
}
