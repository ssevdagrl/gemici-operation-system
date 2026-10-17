import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Post('users')
  createUser(
    @Req() request: AuthenticatedRequest,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.adminService.createUser(
      request.user.sub,
      createUserDto,
    );
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(
      request.user.sub,
      userId,
      updateUserStatusDto,
    );
  }

  @Get('shifts')
  findShiftHistory() {
    return this.adminService.findShiftHistory();
  }
}