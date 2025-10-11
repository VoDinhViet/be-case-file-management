import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
import type { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { GetMyCaseStatisticsReqDto } from './dto/get-my-case-statistics.req.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiPublic()
  @Get('export')
  async export(@Query() query: any, @Res() res: Response) {
    return this.reportsService.exportFromTemplate(res);
  }

  @ApiAuth({
    summary: 'Thống kê số vụ án của mình',
  })
  @Get('case/:userId')
  async caseStatistics(
    @Param('userId') userId: string,
    @Query() reqDto: GetMyCaseStatisticsReqDto,
  ) {
    return this.reportsService.caseStatistics(reqDto, userId);
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
    return this.reportsService.caseStatistics(reqDto, payload.id);
  }
}
