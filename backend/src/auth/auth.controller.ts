import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../generated/prisma/client';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signIn(loginDto);

    response.cookie('busops_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request.user.sub);
  }

  @Get('admin-test')
 @UseGuards(AuthGuard, RolesGuard)
 @Roles(UserRole.MANAGER)
 adminTest() {
   return {
     message: 'Yönetici yetkisi doğrulandı.',
  };
}

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('busops_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return {
      message: 'Oturum kapatıldı.',
    };
  }
}