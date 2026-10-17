import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({
    message: 'Aktiflik bilgisi doğru veya yanlış olmalıdır.',
  })
  isActive!: boolean;
}