import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRideNoteDto {
  @IsString()
  @MinLength(1, {
    message: 'Not boş bırakılamaz.',
  })
  @MaxLength(1000, {
    message: 'Not en fazla 1000 karakter olabilir.',
  })
  content!: string;
}