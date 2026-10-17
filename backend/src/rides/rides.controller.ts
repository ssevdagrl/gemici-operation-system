import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { CreateRideNoteDto } from './dto/create-ride-note.dto';
import { RideQueryDto } from './dto/ride-query.dto';
import { UpdateRideMarkerDto } from './dto/update-ride-marker.dto';
import { RidesService } from './rides.service';

@Controller('rides')
@UseGuards(AuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: RideQueryDto,
  ) {
    return this.ridesService.findAll(request.user.sub, query);
  }

  @Get(':rideId')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('rideId') rideId: string,
  ) {
    return this.ridesService.findOne(
      request.user.sub,
      rideId,
    );
  }

  @Patch(':rideId/marker')
  updateMarker(
    @Req() request: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Body() updateRideMarkerDto: UpdateRideMarkerDto,
  ) {
    return this.ridesService.updateMarker(
      request.user.sub,
      rideId,
      updateRideMarkerDto,
    );
  }

  @Get(':rideId/notes')
  findNotes(@Param('rideId') rideId: string) {
    return this.ridesService.findNotes(rideId);
  }

  @Post(':rideId/notes')
  createNote(
    @Req() request: AuthenticatedRequest,
    @Param('rideId') rideId: string,
    @Body() createRideNoteDto: CreateRideNoteDto,
  ) {
    return this.ridesService.createNote(
      request.user.sub,
      rideId,
      createRideNoteDto,
    );
  }
}