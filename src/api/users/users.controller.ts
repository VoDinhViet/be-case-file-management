import { Body, Controller, Delete, Get, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ApiAuth } from '../../decorators/http.decorators';
import type { JwtPayloadType } from '../auth/types/jwt-payload.type';
import { PageUserReqDto } from './dto/page-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UsersService } from './users.service';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Roles(RoleEnum.MANAGEMENT)
  @ApiAuth({
    summary: 'Lấy danh sách người dùng [ADMIN]',
  })
  @Get()
  async getPageUsers(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageUserReqDto,
  ) {
    return await this.usersService.getPageUsers(reqDto, payload);
  }

  @Put(':userId')
  async updateUser(
    @Query('userId') userId: string,
    @Body() reqDto: UpdateUserReqDto,
  ) {
    return await this.usersService.updateByUserId(userId, reqDto);
  }

  @Put('profile')
  async updateMyProfile(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: UpdateUserReqDto,
  ) {
    return await this.usersService.updateByUserId(payload.id, reqDto);
  }

  @Delete(':userId')
  async deleteUser(
    @CurrentUser() payload: JwtPayloadType,
    @Query('userId') userId: string,
  ) {
    return await this.usersService.deleteUser(userId, payload);
  }
}
