import { Inject, Injectable } from '@nestjs/common';
import { count, desc, eq, getTableColumns, or, sql } from 'drizzle-orm';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { Order } from '../../constants/app.constant';
import { DRIZZLE } from '../../database/database.module';
import { casesTable, referralTable, usersTable } from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { hashPassword } from '../../utils/password.util';
import { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { CreateUserReqDto } from './dto/create-user.req.dto';
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
    // Xây dựng điều kiện tìm kiếm
    const whereConditions = reqDto.q
      ? or(
          sql`unaccent(${usersTable.phone}) ILIKE unaccent(${`%${reqDto.q}%`})`,
          sql`unaccent(${usersTable.fullName}) ILIKE unaccent(${`%${reqDto.q}%`})`,
        )
      : undefined;

    // Query để lấy danh sách user kèm tổng số case
    const usersQuery = this.db
      .select({
        ...getTableColumns(usersTable),
        // Đếm tổng số case của user
        totalCases: sql<number>`CAST(COUNT(${casesTable.id}) AS INTEGER)`,
      })
      .from(usersTable)
      .leftJoin(casesTable, eq(casesTable.userId, usersTable.id))
      .where(whereConditions)
      .groupBy(usersTable.id)
      .orderBy(
        reqDto.order === Order.DESC
          ? desc(usersTable.createdAt)
          : desc(usersTable.createdAt),
      )
      .limit(reqDto.limit)
      .offset(reqDto.offset);

    // Query để đếm tổng số user (không bao gồm pagination)
    const countQuery = this.db
      .select({ count: count() })
      .from(usersTable)
      .where(whereConditions);

    // Thực hiện cả 2 query song song
    const [entities, [{ count: totalCount }]] = await Promise.all([
      usersQuery,
      countQuery,
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
    console.log('Updating user with data:', reqDto);
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

  selectUsers(q: string | undefined) {
    return this.db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        phone: usersTable.phone,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(
        q
          ? or(
              sql`unaccent(${usersTable.phone}) ILIKE unaccent(${`%${q}%`})`,
              sql`unaccent(${usersTable.fullName}) ILIKE unaccent(${`%${q}%`})`,
            )
          : undefined,
      )
      .limit(20)
      .orderBy(desc(usersTable.createdAt));
  }

  async create(reqDto: CreateUserReqDto, payload: JwtPayloadType) {
    return this.db
      .insert(usersTable)
      .values({
        ...reqDto,
        createdBy: payload.id,
        password: await hashPassword(reqDto.password),
      })
      .returning();
  }
}
