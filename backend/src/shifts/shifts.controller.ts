import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { StartShiftDto } from './dto/start-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
@UseGuards(AuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('active')
  async getActiveShift(@Req() request: AuthenticatedRequest) {
    const shift = await this.shiftsService.getActiveShift(
      request.user.sub,
    );

    return {
      shift,
    };
  }

  @Post('start')
  startShift(
    @Req() request: AuthenticatedRequest,
    @Body() startShiftDto: StartShiftDto,
  ) {
    return this.shiftsService.startShift(
      request.user.sub,
      startShiftDto,
    );
  }

  @Post('end')
  @HttpCode(HttpStatus.OK)
  endShift(@Req() request: AuthenticatedRequest) {
    return this.shiftsService.endShift(request.user.sub);
  }
}