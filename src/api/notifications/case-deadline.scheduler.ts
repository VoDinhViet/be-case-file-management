import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import {
  casePhasesTable,
  casesTable,
  CaseStatusEnum,
  NotificationTypeEnum,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { NotificationsService } from './notifications.service';

@Injectable()
export class CaseDeadlineScheduler {
  private readonly logger = new Logger(CaseDeadlineScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Chạy mỗi ngày lúc 9:00 sáng để kiểm tra cases sắp hết hạn
   * Deadline được tính dựa trên phase cuối cùng (theo order)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkUpcomingDeadlines() {
    this.logger.log('Bắt đầu kiểm tra cases sắp hết hạn...');

    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);

    try {
      // Lấy endDate lớn nhất từ phases của mỗi case
      const upcomingCases = await this.db
        .select({
          caseId: casesTable.id,
          caseName: casesTable.name,
          userId: casesTable.userId,
          latestEndDate: sql<Date>`MAX(${casePhasesTable.endDate})`.mapWith(
            (val) => (val ? new Date(val) : null),
          ),
        })
        .from(casesTable)
        .innerJoin(casePhasesTable, eq(casesTable.id, casePhasesTable.caseId))
        .where(
          and(
            isNotNull(casesTable.userId),
            eq(casesTable.status, CaseStatusEnum.IN_PROGRESS),
            isNotNull(casePhasesTable.endDate),
          ),
        )
        .groupBy(casesTable.id, casesTable.name, casesTable.userId)
        .having(
          and(
            gte(sql`MAX(${casePhasesTable.endDate})`, now),
            lte(sql`MAX(${casePhasesTable.endDate})`, threeDaysLater),
          ),
        );

      this.logger.log(`Tìm thấy ${upcomingCases.length} cases sắp hết hạn`);

      // Gửi thông báo cho từng case
      for (const caseItem of upcomingCases) {
        if (!caseItem.userId || !caseItem.latestEndDate) continue;

        const daysLeft = Math.ceil(
          (caseItem.latestEndDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await this.notificationsService.createNotification({
          userId: caseItem.userId,
          caseId: caseItem.caseId,
          type: NotificationTypeEnum.CASE_DEADLINE_SOON,
          title: 'Vụ án sắp hết hạn',
          body: `Vụ án "${caseItem.caseName}" sẽ hết hạn trong ${daysLeft} ngày (${caseItem.latestEndDate.toLocaleDateString('vi-VN')})`,
        });

        this.logger.log(
          `Đã gửi thông báo cho user ${caseItem.userId} về case ${caseItem.caseId}`,
        );
      }

      this.logger.log('Hoàn thành kiểm tra cases sắp hết hạn');
    } catch (error) {
      this.logger.error('Lỗi khi kiểm tra cases sắp hết hạn:', error);
    }
  }

  /**
   * Chạy mỗi ngày lúc 10:00 sáng để kiểm tra cases quá hạn
   * Deadline được tính dựa trên phase cuối cùng (theo order)
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkOverdueCases() {
    this.logger.log('Bắt đầu kiểm tra cases quá hạn...');

    const now = new Date();

    try {
      // Tìm các cases đã quá hạn nhưng vẫn đang xử lý
      const overdueCases = await this.db
        .select({
          caseId: casesTable.id,
          caseName: casesTable.name,
          userId: casesTable.userId,
          latestEndDate: sql<Date>`MAX(${casePhasesTable.endDate})`.mapWith(
            (val) => (val ? new Date(val) : null),
          ),
        })
        .from(casesTable)
        .innerJoin(casePhasesTable, eq(casesTable.id, casePhasesTable.caseId))
        .where(
          and(
            isNotNull(casesTable.userId),
            eq(casesTable.status, CaseStatusEnum.IN_PROGRESS),
            isNotNull(casePhasesTable.endDate),
          ),
        )
        .groupBy(casesTable.id, casesTable.name, casesTable.userId)
        .having(lte(sql`MAX(${casePhasesTable.endDate})`, now));

      this.logger.log(`Tìm thấy ${overdueCases.length} cases quá hạn`);

      // Gửi thông báo cho từng case quá hạn
      for (const caseItem of overdueCases) {
        if (!caseItem.userId || !caseItem.latestEndDate) continue;

        const daysOverdue = Math.floor(
          (now.getTime() - caseItem.latestEndDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        await this.notificationsService.createNotification({
          userId: caseItem.userId,
          caseId: caseItem.caseId,
          type: NotificationTypeEnum.CASE_OVERDUE,
          title: '⚠️ Vụ án quá hạn',
          body: `Vụ án "${caseItem.caseName}" đã quá hạn ${daysOverdue} ngày. Vui lòng xử lý ngay!`,
        });

        this.logger.log(
          `Đã gửi cảnh báo quá hạn cho user ${caseItem.userId} về case ${caseItem.caseId}`,
        );
      }

      this.logger.log('Hoàn thành kiểm tra cases quá hạn');
    } catch (error) {
      this.logger.error('Lỗi khi kiểm tra cases quá hạn:', error);
    }
  }
}
