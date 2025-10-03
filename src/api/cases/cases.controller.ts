import { Body, Controller, Post } from '@nestjs/common';
import { ApiAuth } from '../../decorators/http.decorators';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @ApiAuth({
    summary: 'Create a new case',
  })
  @Post()
  async createCase(@Body() reqDto: any) {
    return await this.casesService.createCase(reqDto);
  }
}
