import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiAuth } from '../../decorators/http.decorators';
import { Roles } from '../../decorators/role.decorator';
import type { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { RoleEnum } from '../auth/types/role.enum';
import { PageUserReqDto } from '../users/dto/page-user.req.dto';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.req.dto';
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';
import { UpdateCaseReqDto } from './dto/update-case.req.dto';
import { UpdatePhasesReqDto } from './dto/update-phases.req.dto';

@Controller({
  path: 'cases',
  version: '1',
})
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

  @Roles(RoleEnum.STAFF)
  @ApiAuth({
    summary: 'Get paginated list of cases',
  })
  @Get()
  async getPageCases(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageUserReqDto,
  ) {
    return this.casesService.getPageCases(reqDto, payload);
  }

  @ApiAuth({
    summary: 'Get case by ID',
  })
  @Get(':caseId')
  async getCaseById(@Param('caseId') caseId: string) {
    return this.casesService.getCaseById(caseId);
  }

  @ApiAuth({
    summary: 'Update case by ID',
  })
  @Put(':caseId')
  async updateCaseById(
    @Param('caseId') caseId: string,
    @Body() reqDto: UpdateCaseReqDto,
  ) {
    console.log('Updating case:', caseId, reqDto);
    return this.casesService.updateCaseById(caseId, reqDto);
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

  //update phases by case id
  @ApiAuth({
    summary: 'Update phases by case ID',
  })
  @Put('phases/:phaseId')
  async updatePhasesByCaseId(
    @Param('phaseId') phaseId: string,
    @Body() reqDto: UpdatePhasesReqDto,
  ) {
    return this.casesService.updatePhasesByCaseId(phaseId, reqDto);
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

  @ApiAuth({
    summary: 'Delete case by ID',
  })
  @Delete(':caseId')
  async deleteCaseById(
    @CurrentUser() payload: JwtPayloadType,
    @Param('caseId') caseId: string,
  ) {
    return this.casesService.deleteCaseById(caseId, payload);
  }
}
