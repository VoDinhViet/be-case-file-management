import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.req.dto';
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';

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

  @ApiAuth({
    summary: 'Get case by ID',
  })
  @Get(':caseId')
  async getCaseById(@Param('caseId') caseId: string) {
    return this.casesService.getCaseById(caseId);
  }

  // add task to case
  @ApiAuth({
    summary: 'Add phase to case',
  })
  @Post(':caseId/phases')
  async addPhaseToCase(
    @Param('caseId') caseId: string,
    @Body() reqDto: CreatePhasesReqDto,
  ) {
    console.log('Adding phase to case:', caseId, reqDto);
    return this.casesService.addPhaseToCase(caseId, reqDto);
  }

  @ApiAuth({
    summary: 'Get phases by case ID',
  })
  @Get(':caseId/phases')
  async getPhasesByCaseId(@Param('caseId') caseId: string) {
    return this.casesService.getPhasesByCaseId(caseId);
  }

  // update phase by id
  @ApiAuth({
    summary: 'Update phase by ID',
  })
  @Post('phases/:phaseId')
  async updatePhaseById(
    @Param('phaseId') phaseId: string,
    @Body() reqDto: CreatePhasesReqDto,
  ) {
    console.log('Updating phase:', phaseId, reqDto);
    return this.casesService.updatePhaseById(phaseId, reqDto);
  }
}
