import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiAuth, ApiPublic } from '../../decorators/http.decorators';
import { CreateTemplateReqDto } from './dto/create-template.req.dto';
import { PageTemplateReqDto } from './dto/page-template.req.dto';
import { UpdateTemplateReqDto } from './dto/update-template.req.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiPublic()
  @Post()
  async createTemplates(@Body() reqDto: CreateTemplateReqDto) {
    return await this.templatesService.createTemplates(reqDto);
  }

  //update template
  @ApiAuth()
  @Put(':templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() reqDto: UpdateTemplateReqDto,
  ) {
    console.log('Updating template:', templateId, JSON.stringify(reqDto));
    return await this.templatesService.updateTemplate(templateId, reqDto);
  }

  @ApiPublic()
  @Get()
  async getPageTemplates(@Query() reqDto: PageTemplateReqDto) {
    return this.templatesService.getPageTemplates(reqDto);
  }

  @ApiAuth()
  @Get(':templateId')
  async getTemplateById(@Param('templateId') templateId: string) {
    return this.templatesService.getTemplateById(templateId);
  }
}
