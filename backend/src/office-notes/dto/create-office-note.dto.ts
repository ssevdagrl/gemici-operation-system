import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOfficeNoteDto {
  @IsString()
  @MinLength(1, {
    message: 'Not boş bırakılamaz.',
  })
  @MaxLength(1000, {
    message: 'Not en fazla 1000 karakter olabilir.',
  })
  content!: string;

  @IsOptional()
  @IsISO8601(
    {},
    {
      message: 'Geçerli bir sona erme tarihi gönderilmelidir.',
    },
  )
  expiresAt?: string;
}