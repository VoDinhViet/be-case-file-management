import { Module } from '@nestjs/common';
import { CaseDeadlineScheduler } from './case-deadline.scheduler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, CaseDeadlineScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
