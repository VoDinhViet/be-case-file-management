import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { DRIZZLE } from '../../database/database.module';
import { usersTable } from '../../database/schemas';
import type {
  DrizzleDB,
  FindManyQueryConfig,
} from '../../database/types/drizzle';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { PageUserReqDto } from './dto/page-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}
  async existByUserName(username: string) {
    return this.db.query.usersTable.findFirst({
      where: eq(usersTable.username, username),
      columns: { id: true },
    });
  }

  async existByUserPhone(phone: string) {
    return this.db.query.usersTable.findFirst({
      where: eq(usersTable.phone, phone),
      columns: { id: true },
    });
  }

  async getPageUsers(reqDto: PageUserReqDto, payload: JwtPayloadType) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.usersTable> = {
      where: and(
        or(
          ilike(usersTable.phone, `%${reqDto.q ?? ''}%`),
          ilike(usersTable.fullName, `%${reqDto.q ?? ''}%`),
        ),
      ),
    };

    const qCount = this.db.query.usersTable.findMany({
      ...baseConfig,
      columns: { id: true },
    });

    const [entities, [{ totalCount }]] = await Promise.all([
      this.db.query.usersTable.findMany({
        ...baseConfig,
        orderBy: [
          ...(reqDto.order === Order.DESC
            ? [desc(usersTable.createdAt)]
            : [desc(usersTable.createdAt)]),
        ],
        limit: reqDto.limit,
        offset: reqDto.offset,
      }),
      this.db.select({ totalCount: count() }).from(sql`${qCount}`),
    ]);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(entities, meta);
  }

  async deleteUser(userId: string, payload: JwtPayloadType) {
    return this.db
      .delete(usersTable)
      .where(eq(usersTable.id, userId))
      .returning();
  }

  async updateByUserId(userId: string, reqDto: UpdateUserReqDto) {
    return this.db
      .update(usersTable)
      .set({
        ...reqDto,
      })
      .where(eq(usersTable.id, userId))
      .returning();
  }
}
