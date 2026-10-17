import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StartShiftDto {
  @IsISO8601()
  scheduledStart!: string;

  @IsISO8601()
  scheduledEnd!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}