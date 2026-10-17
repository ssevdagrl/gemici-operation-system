import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(loginDto: LoginDto) {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Kullanıcı adı veya parola hatalı.',
      );
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Kullanıcı adı veya parola hatalı.',
      );
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
  
  async getCurrentUser(userId: string) {
  const user = await this.usersService.findSafeUserById(userId);

  if (!user || !user.isActive) {
    throw new UnauthorizedException('Kullanıcı aktif değil.');
  }

  return user;
}

}