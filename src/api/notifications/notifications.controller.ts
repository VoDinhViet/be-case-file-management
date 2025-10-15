import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
import type { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { CreateNotificationReqDto } from './dto/create-notification.req.dto';
import { CreateTokenReqDto } from './dto/create-token.req.dto';
import { PageNotificationReqDto } from './dto/page-notification.req.dto';
import { SendFcmNotificationReqDto } from './dto/send-fcm-notification.req.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiPublic()
  @Post('/create-token')
  async addExpoTokenToDatabase(@Body() reqDto: CreateTokenReqDto) {
    return this.notificationsService.addTokenToDatabase(reqDto);
  }

  @ApiPublic()
  @Post('/send')
  async sendNotification(@Body() reqDto: CreateNotificationReqDto) {
    return this.notificationsService.send(reqDto);
  }

  @ApiAuth({ summary: 'Lấy danh sách thông báo' })
  @Get()
  async getNotifications(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageNotificationReqDto,
  ) {
    return this.notificationsService.getPageNotifications(payload.id, reqDto);
  }

  @ApiAuth({ summary: 'Đếm số thông báo chưa đọc' })
  @Get('/unread-count')
  async getUnreadCount(@CurrentUser() payload: JwtPayloadType) {
    return this.notificationsService.getUnreadCount(payload.id);
  }

  @ApiAuth({ summary: 'Đánh dấu thông báo đã đọc' })
  @Patch('/:notificationId/read')
  async markAsRead(
    @CurrentUser() payload: JwtPayloadType,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, payload.id);
  }

  @ApiAuth({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @Patch('/mark-all-read')
  async markAllAsRead(@CurrentUser() payload: JwtPayloadType) {
    return this.notificationsService.markAllAsRead(payload.id);
  }

  @ApiAuth({ summary: 'Test gửi FCM push notification' })
  @Post('/accc/send-fcm')
  async sendFcmNotification(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: SendFcmNotificationReqDto,
  ) {
    console.log('Sending FCM push to user:', payload.id, reqDto);
    return this.notificationsService.sendFcmPushToUser(
      '7a7c50eb-bb00-4bf3-bbad-88515b8302c6',
      reqDto.title,
      reqDto.body,
      reqDto.imageUrl,
    );
  }
}
