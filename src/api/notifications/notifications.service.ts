import { Inject, Injectable } from '@nestjs/common';
import { eq, isNotNull } from 'drizzle-orm';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { DRIZZLE } from '../../database/database.module';
import { usersTable } from '../../database/schemas';
import type { DrizzleDB } from '../../database/types/drizzle';
import { CreateNotificationReqDto } from './dto/create-notification.req.dto';
import { CreateTokenReqDto } from './dto/create-token.req.dto';

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async addTokenToDatabase(reqDto: CreateTokenReqDto) {
    const { tokenExpo, userId } = reqDto;
    return this.db
      .update(usersTable)
      .set({ tokenExpo })
      .where(eq(usersTable.id, userId))
      .returning();
  }

  async send(reqDto: CreateNotificationReqDto) {
    const expo = new Expo();
    const { title, body } = reqDto;

    const users = await this.db
      .select()
      .from(usersTable)
      .where(isNotNull(usersTable.tokenExpo));

    const messages: ExpoPushMessage[] = [];

    for (const user of users) {
      const token = user.tokenExpo;
      if (token && Expo.isExpoPushToken(token)) {
        messages.push({
          to: token,
          sound: 'default',
          title,
          body,
        });
      } else {
        console.warn(`Invalid Expo push token: ${token}`);
      }
    }

    // Gửi theo batch (Expo giới hạn ~100 message mỗi lần)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log('Sent batch:', tickets);
      } catch (error) {
        console.error('Error sending batch:', error);
      }
    }
  }
}
