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
import { CreateUserReqDto } from './dto/create-user.req.dto';
import { PageUserReqDto } from './dto/page-user.req.dto';
import { UpdateUserReqDto } from './dto/update-user.req.dto';
import { UsersService } from './users.service';

@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Tạo tài khoản [ADMIN]',
  })
  @Post()
  async create(
    @CurrentUser() payload: JwtPayloadType,
    @Body() reqDto: CreateUserReqDto,
  ) {
    return await this.usersService.create(reqDto, payload);
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Lấy danh sách người dùng [ADMIN]',
  })
  @Get()
  async getPageUsers(
    @CurrentUser() payload: JwtPayloadType,
    @Query() reqDto: PageUserReqDto,
  ) {
    return await this.usersService.getPageUsers(reqDto);
  }

  @Put(':userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() reqDto: UpdateUserReqDto,
  ) {
    return await this.usersService.updateByUserId(userId, reqDto);
  }

  @ApiAuth()
  @Get('profile')
  async updateMyProfile(@CurrentUser() payload: JwtPayloadType) {
    return this.usersService.findById(payload.id);
  }

  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string) {
    return await this.usersService.deleteUser(userId);
  }

  // láy mã mời của admin
  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Random mã mời admin [ADMIN]',
  })
  @Get('referral-code')
  async getReferralCode() {
    return this.usersService.getReferralCode();
  }

  @Roles(RoleEnum.ADMIN)
  @ApiAuth({
    summary: 'Random mã mời ngẫu nhiên [ADMIN]',
  })
  @Get('referral-code/random')
  async randomReferralCode() {
    return this.usersService.randomReferralCode();
  }

  // select all users
  @Roles(RoleEnum.STAFF)
  @ApiAuth({
    summary: 'Select all users [ADMIN]',
  })
  @Get('all')
  async selectAllUsers() {
    return this.usersService.selectAllUsers();
  }
}
