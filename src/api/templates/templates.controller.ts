import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiPublic } from '../../decorators/http.decorators';
import { CreateTemplateReqDto } from './dto/create-template.req.dto';
import { PageTemplateReqDto } from './dto/page-template.req.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @ApiPublic()
  @Post()
  async createTemplates(@Body() reqDto: CreateTemplateReqDto) {
    return await this.templatesService.createTemplates(reqDto);
  }

  @ApiPublic()
  @Get()
  async getPageTemplates(@Query() reqDto: PageTemplateReqDto) {
    return this.templatesService.getPageTemplates(reqDto);
  }
}
