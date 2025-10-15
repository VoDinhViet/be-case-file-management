import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [CasesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
