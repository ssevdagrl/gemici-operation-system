import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Kullanıcı adı geçersiz karakter içeriyor.',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}