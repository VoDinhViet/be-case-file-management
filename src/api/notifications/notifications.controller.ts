import { Body, Controller, Post } from '@nestjs/common';
import { ApiPublic } from '../../decorators/http.decorators';
import { CreateNotificationReqDto } from './dto/create-notification.req.dto';
import { CreateTokenReqDto } from './dto/create-token.req.dto';
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
}
