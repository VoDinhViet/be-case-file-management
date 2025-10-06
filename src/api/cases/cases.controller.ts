import { Controller, Get, Query } from '@nestjs/common';
import { ApiPublic } from '../../decorators/http.decorators';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // @ApiAuth({
  //   summary: 'Create a new case',
  // })
  // @Post()
  // async createCase(@Body() reqDto: CreateCaseDto) {
  //   return await this.casesService.createCase(reqDto);
  // }

  @ApiPublic()
  @Get()
  async getPageCases(@Query() reqDto: PageUserReqDto) {
    return this.casesService.getPageCases(reqDto);
  }
}
