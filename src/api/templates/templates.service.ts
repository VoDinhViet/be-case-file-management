import { Inject, Injectable } from '@nestjs/common';
import { count, desc, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { DRIZZLE } from '../../database/database.module';
import { templateFields, templates } from '../../database/schemas';
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
    const [tpl] = await this.db
      .insert(templates)
      .values({
        ...reqDto,
      })
      .returning();

    if (reqDto.fields?.length) {
      await this.db.insert(templateFields).values(
        reqDto.fields.map((f) => ({
          templateId: tpl.id,
          ...f,
        })),
      );
    }

    return tpl;
  }

  async getPageTemplates(reqDto: PageTemplateReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.templates> = {
      with: {
        fields: true,
      },
    };

    const qCount = this.db.query.templates.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.templates.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(templates.createdAt)]
            : [desc(templates.createdAt)]),
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
