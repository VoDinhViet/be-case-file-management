import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
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
    return await this.casesService.createCase(reqDto);
  }

  @ApiPublic()
  @Get()
  async getPageCases() {
    return this.casesService.getPageCases();
  }
}
