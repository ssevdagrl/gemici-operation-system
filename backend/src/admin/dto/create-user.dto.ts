import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(3, {
    message: 'Kullanıcı adı en az 3 karakter olmalıdır.',
  })
  @MaxLength(30, {
    message: 'Kullanıcı adı en fazla 30 karakter olabilir.',
  })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Kullanıcı adı yalnızca harf, rakam, nokta, tire ve alt çizgi içerebilir.',
  })
  username!: string;

  @IsString()
  @MinLength(2, {
    message: 'Ad soyad en az 2 karakter olmalıdır.',
  })
  @MaxLength(100, {
    message: 'Ad soyad en fazla 100 karakter olabilir.',
  })
  fullName!: string;

  @IsString()
  @MinLength(8, {
    message: 'Parola en az 8 karakter olmalıdır.',
  })
  @MaxLength(128, {
    message: 'Parola en fazla 128 karakter olabilir.',
  })
  password!: string;

  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Geçerli bir kullanıcı rolü seçilmelidir.',
  })
  role?: UserRole;
}