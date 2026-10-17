import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../generated/prisma/client';
import { CreateOfficeNoteDto } from './dto/create-office-note.dto';
import { UpdateOfficeNoteDto } from './dto/update-office-note.dto';
import { OfficeNotesService } from './office-notes.service';

@Controller('office-notes')
@UseGuards(AuthGuard)
export class OfficeNotesController {
  constructor(
    private readonly officeNotesService: OfficeNotesService,
  ) {}

  @Get()
  findAll() {
    return this.officeNotesService.findAll();
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createOfficeNoteDto: CreateOfficeNoteDto,
  ) {
    return this.officeNotesService.create(
      request.user.sub,
      createOfficeNoteDto,
    );
  }

  @Patch(':noteId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('noteId') noteId: string,
    @Body() updateOfficeNoteDto: UpdateOfficeNoteDto,
  ) {
    return this.officeNotesService.update(
      request.user.sub,
      noteId,
      updateOfficeNoteDto,
    );
  }
}