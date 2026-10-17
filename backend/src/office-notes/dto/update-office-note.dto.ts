import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOfficeNoteDto {
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}