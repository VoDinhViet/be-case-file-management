import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { DRIZZLE } from '../../database/database.module';
import { referralTable, usersTable } from '../../database/schemas';
import type {
  DrizzleDB,
  FindManyQueryConfig,
} from '../../database/types/drizzle';
import { hashPassword } from '../../utils/password.util';
import { PageUserReqDto } from './dto/page-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB, // Replace with actual type
  ) {}

  async existByUserPhone(phone: string) {
    return this.db.query.usersTable.findFirst({
      where: eq(usersTable.phone, phone),
      columns: { id: true },
    });
  }

  async getPageUsers(reqDto: PageUserReqDto) {
    const baseConfig: FindManyQueryConfig<typeof this.db.query.usersTable> = {
      where: and(
        or(
          ...(reqDto.q
            ? [
                sql`unaccent(${usersTable.phone}) ILIKE unaccent(${`%${reqDto.q}%`})`,
                sql`unaccent(${usersTable.fullName}) ILIKE unaccent(${`%${reqDto.q}%`})`,
              ]
            : []),
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

  async deleteUser(userId: string) {
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
        ...(reqDto.password
          ? { password: await hashPassword(reqDto.password) }
          : {}),
      })
      .where(eq(usersTable.id, userId))
      .returning();
  }

  async findById(userId: string) {
    return this.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
  }

  async getReferralCode() {
    return this.db.query.referralTable.findFirst();
  }

  async randomReferralCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    //save to db
    const [createdCode] = await this.db
      .update(referralTable)
      .set({ code })
      .returning();
    return createdCode;
  }
}
