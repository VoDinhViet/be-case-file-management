import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { OffsetPaginationDto } from '../../common/dto/offset-pagination/ offset-pagination.dto';
import { OffsetPaginatedDto } from '../../common/dto/offset-pagination/paginated.dto';
import { DRIZZLE } from '../../database/database.module';
import {
  notificationsTable,
  NotificationTypeEnum,
  usersTable,
} from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { FirebaseService } from '../../firebase/firebase.service';
import { RoleEnum } from '../auth/types/role.enum';
import { CreateNotificationReqDto } from './dto/create-notification.req.dto';
import { CreateTokenReqDto } from './dto/create-token.req.dto';
import { PageNotificationReqDto } from './dto/page-notification.req.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly firebaseService: FirebaseService,
  ) {}

  async addTokenToDatabase(reqDto: CreateTokenReqDto) {
    const { tokenExpo, userId } = reqDto;
    return this.db
      .update(usersTable)
      .set({ tokenExpo })
      .where(eq(usersTable.id, userId))
      .returning();
  }

  /**
   * Tạo notification trong database và gửi push notification (Expo + FCM)
   */
  async createNotification(data: {
    userId: string;
    caseId?: string;
    type: NotificationTypeEnum;
    title: string;
    body: string;
  }) {
    // Kiểm tra user có tồn tại không
    const userExists = await this.db.query.usersTable.findFirst({
      where: eq(usersTable.id, data.userId),
      columns: { id: true },
    });

    if (!userExists) {
      this.logger.warn(
        `⚠️ Bỏ qua notification: User ${data.userId} không tồn tại (case: ${data.caseId})`,
      );
      return null; // Trả về null thay vì throw error
    }

    // Lưu vào database
    const [notification] = await this.db
      .insert(notificationsTable)
      .values(data)
      .returning();

    // Gửi push notification qua cả Expo và Firebase
    await this.sendAllPushNotifications(data.userId, data.title, data.body);

    return notification;
  }

  /**
   * Gửi push notification qua tất cả các kênh (Expo + Firebase)
   */
  private async sendAllPushNotifications(
    userId: string,
    title: string,
    body: string,
  ) {
    // Gửi song song cả Expo và Firebase notification
    await Promise.allSettled([
      this.sendPushToUser(userId, title, body),
      this.sendFcmPushToUser(userId, title, body),
    ]);
  }

  /**
   * Gửi Expo push notification cho một user cụ thể
   */
  async sendPushToUser(userId: string, title: string, body: string) {
    const user = await this.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      columns: { tokenExpo: true },
    });

    if (!user?.tokenExpo) {
      this.logger.warn(`User ${userId} không có token Expo`);
      return;
    }

    if (!Expo.isExpoPushToken(user.tokenExpo)) {
      this.logger.warn(`Token Expo không hợp lệ: ${user.tokenExpo}`);
      return;
    }

    try {
      const message: ExpoPushMessage = {
        to: user.tokenExpo,
        sound: 'default',
        title,
        body,
      };

      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      this.logger.log(
        `✅ Đã gửi Expo push notification cho user ${userId}`,
        tickets[0]?.status,
      );
    } catch (error) {
      this.logger.error(`❌ Lỗi khi gửi Expo push notification:`, error);
    }
  }

  /**
   * Gửi broadcast notification cho tất cả users (method cũ)
   */
  async send(reqDto: CreateNotificationReqDto) {
    const { title, body } = reqDto;

    const users = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, RoleEnum.ADMIN));

    // send filebase
    await Promise.allSettled(
      users.map((user) => this.sendFcmPushToUser(user.id, title, body)),
    );
    // send expo
    await Promise.allSettled(
      users.map((user) => this.sendPushToUser(user.id, title, body)),
    );
  }

  /**
   * Lấy danh sách notifications của user với phân trang
   */
  async getPageNotifications(userId: string, reqDto: PageNotificationReqDto) {
    const whereConditions = and(eq(notificationsTable.userId, userId));

    // Query lấy danh sách notifications
    const notifications = await this.db.query.notificationsTable.findMany({
      where: whereConditions,
      orderBy: [desc(notificationsTable.createdAt)],
      limit: reqDto.limit,
      offset: reqDto.offset,
      with: {
        case: {
          columns: { id: true, name: true },
        },
      },
    });

    // Query đếm tổng số notifications
    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(notificationsTable)
      .where(whereConditions);

    const meta = new OffsetPaginationDto(totalCount, reqDto);
    return new OffsetPaginatedDto(notifications, meta);
  }

  /**
   * Đánh dấu notification đã đọc
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning();
  }

  /**
   * Đánh dấu tất cả notifications đã đọc
   */
  async markAllAsRead(userId: string) {
    return this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );
  }

  /**
   * Đếm số notifications chưa đọc
   */
  async getUnreadCount(userId: string) {
    const [{ count: unreadCount }] = await this.db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    return { unreadCount };
  }

  /**
   * Xóa notification theo ID
   */
  async deleteNotification(notificationId: string, userId: string) {
    return this.db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning();
  }

  /**
   * Gửi FCM push notification cho một user cụ thể
   */
  async sendFcmPushToUser(
    userId: string,
    title: string,
    body: string,
    _imageUrl?: string,
  ) {
    const user = await this.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      columns: { fcmToken: true, fullName: true },
    });

    if (!user?.fcmToken) {
      this.logger.warn(`User ${userId} không có FCM token`);
      return; // Không throw error, chỉ return để không fail toàn bộ process
    }

    try {
      const messaging = this.firebaseService.getMessaging();

      const message: any = {
        token: user.fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          userId,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      this.logger.log(
        `✅ Đã gửi FCM push notification cho user ${userId} (${user.fullName}): ${response}`,
      );

      return {
        success: true,
        messageId: response,
        userId,
        userName: user.fullName,
      };
    } catch (error) {
      this.logger.error(`❌ Lỗi khi gửi FCM push notification:`, error);
      // Không throw error để không fail toàn bộ process
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      };
    }
  }
}
