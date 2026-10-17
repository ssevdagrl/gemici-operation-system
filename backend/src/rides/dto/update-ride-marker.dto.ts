import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRideMarkerDto {
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  isAlert?: boolean;
}