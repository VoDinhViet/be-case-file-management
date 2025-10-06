import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiPublic } from '../../decorators/http.decorators';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiPublic()
  @Get('export')
  async export(@Query() query: any, @Res() res: Response) {
    return this.reportsService.exportFromTemplate(res);
  }
}
