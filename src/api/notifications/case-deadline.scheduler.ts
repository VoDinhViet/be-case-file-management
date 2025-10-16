import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import {
  casePhasesTable,
  casesTable,
  CaseStatusEnum,
  notificationsTable,
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
   * Kiểm tra xem đã gửi notification cho case này chưa và đã gửi bao lâu rồi
   */
  private async getLastNotificationTime(
    caseId: string,
    userId: string,
  ): Promise<Date | null> {
    const lastNotification = await this.db.query.notificationsTable.findFirst({
      where: and(
        eq(notificationsTable.caseId, caseId),
        eq(notificationsTable.userId, userId),
      ),
      orderBy: [desc(notificationsTable.createdAt)],
    });

    return lastNotification?.createdAt || null;
  }

  /**
   * Kiểm tra xem có nên gửi notification hay không dựa vào thời gian còn lại và lần gửi cuối
   */
  private shouldSendNotification(
    daysLeft: number,
    lastNotificationTime: Date | null,
  ): boolean {
    if (!lastNotificationTime) return true; // Chưa từng gửi thì gửi

    const now = new Date();
    const hoursSinceLastNotification =
      (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);
    const daysSinceLastNotification = hoursSinceLastNotification / 24;

    // Quá hạn (daysLeft < 0): gửi mỗi ngày
    if (daysLeft < 0) {
      return daysSinceLastNotification >= 1;
    }

    // 1-3 ngày: gửi mỗi ngày
    if (daysLeft >= 1 && daysLeft <= 3) {
      return daysSinceLastNotification >= 1;
    }

    // 4-21 ngày (1-3 tuần): gửi mỗi tuần
    if (daysLeft >= 4 && daysLeft <= 21) {
      return daysSinceLastNotification >= 7;
    }

    // 22-90 ngày (1-3 tháng): gửi mỗi tháng
    if (daysLeft >= 22 && daysLeft <= 90) {
      return daysSinceLastNotification >= 30;
    }

    // > 90 ngày: không gửi thông báo
    return false;
  }

  /**
   * Định dạng message dựa vào thời gian còn lại
   */
  private formatNotificationMessage(
    caseName: string,
    daysLeft: number,
    deadline: Date,
  ): { title: string; body: string; type: NotificationTypeEnum } {
    const formattedDate = deadline.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Quá hạn
    if (daysLeft < 0) {
      const daysOverdue = Math.abs(daysLeft);
      return {
        type: NotificationTypeEnum.CASE_OVERDUE,
        title: '🚨 Vụ án đã quá hạn',
        body: `Vụ án "${caseName}" đã quá hạn ${daysOverdue} ngày (hạn: ${formattedDate}). Vui lòng xử lý ngay!`,
      };
    }

    // 1-3 ngày
    if (daysLeft >= 1 && daysLeft <= 3) {
      return {
        type: NotificationTypeEnum.CASE_DEADLINE_SOON,
        title: '⏰ Vụ án sắp hết hạn',
        body: `Vụ án "${caseName}" sẽ hết hạn trong ${daysLeft} ngày (${formattedDate}). Vui lòng xử lý sớm!`,
      };
    }

    // 4-21 ngày (1-3 tuần)
    if (daysLeft >= 4 && daysLeft <= 21) {
      const weeksLeft = Math.ceil(daysLeft / 7);
      return {
        type: NotificationTypeEnum.CASE_DEADLINE_SOON,
        title: '📅 Nhắc nhở vụ án',
        body: `Vụ án "${caseName}" sẽ hết hạn trong ${weeksLeft} tuần (${formattedDate}). Vui lòng theo dõi tiến độ.`,
      };
    }

    // 22-90 ngày (1-3 tháng)
    if (daysLeft >= 22 && daysLeft <= 90) {
      const monthsLeft = Math.ceil(daysLeft / 30);
      return {
        type: NotificationTypeEnum.CASE_DEADLINE_SOON,
        title: '📌 Nhắc nhở vụ án',
        body: `Vụ án "${caseName}" sẽ hết hạn trong khoảng ${monthsLeft} tháng (${formattedDate}). Vui lòng lên kế hoạch xử lý.`,
      };
    }

    // Mặc định
    return {
      type: NotificationTypeEnum.CASE_DEADLINE_SOON,
      title: '📋 Thông báo vụ án',
      body: `Vụ án "${caseName}" có hạn xử lý vào ${formattedDate}.`,
    };
  }

  /**
   * Chạy mỗi ngày lúc 9:00 sáng để kiểm tra deadline các vụ án
   * Logic thông báo:
   * - Quá hạn: thông báo mỗi ngày
   * - Còn 1-3 ngày: thông báo mỗi ngày
   * - Còn 1-3 tuần: thông báo mỗi tuần
   * - Còn 1-3 tháng: thông báo mỗi tháng
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkCaseDeadlines() {
    return this.runDeadlineCheck();
  }

  /**
   * Method công khai để test hoặc trigger manually
   */
  async runDeadlineCheck() {
    this.logger.log('🔔 Bắt đầu kiểm tra deadline các vụ án...');

    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setDate(now.getDate() + 90);

    try {
      // Lấy tất cả cases đang xử lý có deadline trong vòng 3 tháng hoặc đã quá hạn
      const casesWithDeadline = await this.db
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
        .groupBy(casesTable.id, casesTable.name, casesTable.userId);

      this.logger.log(
        `📊 Tìm thấy ${casesWithDeadline.length} vụ án đang xử lý`,
      );

      let sentCount = 0;
      let skippedCount = 0;

      // Xử lý từng case
      for (const caseItem of casesWithDeadline) {
        if (!caseItem.userId || !caseItem.latestEndDate) continue;

        // Tính số ngày còn lại
        const daysLeft = Math.ceil(
          (caseItem.latestEndDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Bỏ qua nếu > 90 ngày
        if (daysLeft > 90) {
          continue;
        }

        // Kiểm tra lần gửi notification cuối
        const lastNotificationTime = await this.getLastNotificationTime(
          caseItem.caseId,
          caseItem.userId,
        );

        // Kiểm tra xem có nên gửi không
        if (!this.shouldSendNotification(daysLeft, lastNotificationTime)) {
          skippedCount++;
          continue;
        }

        // Tạo message phù hợp
        const notification = this.formatNotificationMessage(
          caseItem.caseName || 'Vụ án',
          daysLeft,
          caseItem.latestEndDate,
        );

        // Gửi notification với error handling
        try {
          const result = await this.notificationsService.createNotification({
            userId: caseItem.userId,
            caseId: caseItem.caseId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
          });

          if (result) {
            sentCount++;
            this.logger.log(
              `✅ Đã gửi thông báo cho user ${caseItem.userId} về case ${caseItem.caseId} (còn ${daysLeft} ngày)`,
            );
          } else {
            // User không tồn tại, đã bỏ qua
            skippedCount++;
          }
        } catch (error) {
          this.logger.error(
            `❌ Lỗi khi gửi thông báo cho case ${caseItem.caseId}:`,
            error instanceof Error ? error.message : error,
          );
          skippedCount++;
        }
      }

      this.logger.log(
        `✨ Hoàn thành kiểm tra deadline: Đã gửi ${sentCount} thông báo, bỏ qua ${skippedCount} (chưa đến lần gửi tiếp theo hoặc user không tồn tại)`,
      );
    } catch (error) {
      this.logger.error('❌ Lỗi khi kiểm tra deadline:', error);
    }
  }
}
