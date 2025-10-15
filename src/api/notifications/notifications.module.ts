import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../firebase/firebase.module';
import { CaseDeadlineScheduler } from './case-deadline.scheduler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [FirebaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, CaseDeadlineScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
