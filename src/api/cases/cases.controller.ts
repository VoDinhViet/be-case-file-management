import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.req.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @ApiAuth({
    summary: 'Create a new case',
  })
  @Post()
  async createCase(@Body() reqDto: CreateCaseDto) {
    console.log('Creating case with data:', reqDto);
    return await this.casesService.createCase(reqDto);
  }

  @ApiPublic()
  @Get()
  async getPageCases(@Query() reqDto: PageUserReqDto) {
    return this.casesService.getPageCases(reqDto);
  }
}
