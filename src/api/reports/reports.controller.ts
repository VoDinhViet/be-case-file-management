import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiAuth } from '../../decorators/http.decorators';
import type { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { GetMyCaseStatisticsReqDto } from './dto/get-my-case-statistics.req.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiAuth({
    summary: 'Xuất file docx từ template dựa trên case',
  })
  @Get('export')
  async export(@Query('caseId') caseId: string, @Res() res: Response) {
    return this.reportsService.exportFromTemplate(caseId, res);
  }

  @ApiAuth({
    summary: 'Thống kê số vụ án của mình',
  })
  @Get('case')
  async caseStatistics(
    @Query('userId') userId: string,
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: GetMyCaseStatisticsReqDto,
  ) {
    return this.reportsService.caseStatistics(reqDto, userId, payload);
  }

  // thông kế số vụ án của mình
  @ApiAuth({
    summary: 'Thống kê số vụ án của mình',
  })
  @Get('case/my')
  async myCaseStatistics(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: GetMyCaseStatisticsReqDto,
  ) {
    return this.reportsService.caseStatistics(reqDto, payload.id, payload);
  }
}
