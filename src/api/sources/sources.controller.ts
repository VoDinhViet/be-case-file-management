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
import { CreatePhasesReqDto } from './dto/create-phases.req.dto';
import { CreateSourceDto } from './dto/create-source.req.dto';
import { UpdatePhasesReqDto } from './dto/update-phases.req.dto';
import { UpdateSourceReqDto } from './dto/update-source.req.dto';
import { UpsertPlanReqDto } from './dto/upsert-plan.req.dto';
import { SourcesService } from './sources.service';

@Controller({
  path: 'sources',
  version: '1',
})
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @ApiAuth({
    summary: 'Create a new source',
  })
  @Post()
  async createSource(@Body() reqDto: CreateSourceDto) {
    console.log('Creating source with data:', reqDto);
    return await this.sourcesService.createSource(reqDto);
  }

  @Roles(RoleEnum.STAFF)
  @ApiAuth({
    summary: 'Get paginated list of sources',
  })
  @Get()
  async getPageSources(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageUserReqDto,
  ) {
    return this.sourcesService.getPageSources(reqDto, payload);
  }

  @ApiAuth({
    summary: 'Get source by ID',
  })
  @Get(':sourceId')
  async getSourceById(@Param('sourceId') sourceId: string) {
    return this.sourcesService.getSourceById(sourceId);
  }

  @ApiAuth({
    summary: 'Update source by ID',
  })
  @Put(':sourceId')
  async updateSourceById(
    @Param('sourceId') sourceId: string,
    @Body() reqDto: UpdateSourceReqDto,
  ) {
    console.log('Updating source:', sourceId, reqDto);
    return this.sourcesService.updateSourceById(sourceId, reqDto);
  }

  // add task to source
  @ApiAuth({
    summary: 'Add phase to source',
  })
  @Post(':sourceId/phases')
  async addPhaseToSource(
    @Param('sourceId') sourceId: string,
    @Body() reqDto: CreatePhasesReqDto,
  ) {
    console.log('Adding phase to source:', sourceId, reqDto);
    return this.sourcesService.addPhaseToSource(sourceId, reqDto);
  }

  //update phases by source id
  @ApiAuth({
    summary: 'Update phases by source ID',
  })
  @Put('phases/:phaseId')
  async updatePhasesBySourceId(
    @Param('phaseId') phaseId: string,
    @Body() reqDto: UpdatePhasesReqDto,
  ) {
    return this.sourcesService.updatePhasesBySourceId(phaseId, reqDto);
  }

  @ApiAuth({
    summary: 'Get phases by source ID',
  })
  @Get(':sourceId/phases')
  async getPhasesBySourceId(@Param('sourceId') sourceId: string) {
    return this.sourcesService.getPhasesBySourceId(sourceId);
  }

  // update phase by id
  @ApiAuth({
    summary: 'Update phase by ID',
  })
  @Post('phases/:phaseId')
  async updatePhaseById(
    @Param('phaseId') phaseId: string,
    @Body() reqDto: UpdatePhasesReqDto,
  ) {
    return this.sourcesService.updatePhaseById(phaseId, reqDto);
  }

  @ApiAuth({
    summary: 'Delete phase by ID',
  })
  @Delete('phases/:phaseId')
  async deletePhaseById(@Param('phaseId') phaseId: string) {
    return this.sourcesService.deletePhaseById(phaseId);
  }

  @ApiAuth({
    summary: 'Delete source by ID',
  })
  @Delete(':sourceId')
  async deleteSourceById(
    @CurrentUser() payload: JwtPayloadType,
    @Param('sourceId') sourceId: string,
  ) {
    return this.sourcesService.deleteSourceById(sourceId, payload);
  }

  // ==================== SOURCE PLANS ENDPOINTS ====================

  @ApiAuth({
    summary: 'Upsert plan for source (create or update)',
  })
  @Put(':sourceId/plan')
  async upsertPlanForSource(
    @Param('sourceId') sourceId: string,
    @Body() reqDto: UpsertPlanReqDto,
  ) {
    console.log('Upserting plan for source:', sourceId, reqDto);
    return this.sourcesService.upsertPlanForSource(sourceId, reqDto);
  }

  @ApiAuth({
    summary: 'Get plan by source ID',
  })
  @Get(':sourceId/plan')
  async getPlanBySourceId(@Param('sourceId') sourceId: string) {
    return this.sourcesService.getPlanBySourceId(sourceId);
  }
}
