import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface SessionPayload {
  sub: string;
  username: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: SessionPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const cookies = request.cookies as Record<
      string,
      string | undefined
    >;

    const token = cookies.busops_session;

    if (!token) {
      throw new UnauthorizedException('Oturum bulunamadı.');
    }

    try {
      request.user =
        await this.jwtService.verifyAsync<SessionPayload>(token);

      return true;
    } catch {
      throw new UnauthorizedException(
        'Oturum geçersiz veya süresi dolmuş.',
      );
    }
  }
}