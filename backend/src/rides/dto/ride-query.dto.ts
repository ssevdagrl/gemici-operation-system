import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RideStatus } from '../../generated/prisma/client';

export class RideQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsBooleanString()
  onlyStarred?: string;

  @IsOptional()
  @IsBooleanString()
  onlyAlert?: string;
}