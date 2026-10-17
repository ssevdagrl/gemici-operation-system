import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShiftStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StartShiftDto } from './dto/start-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveShift(userId: string) {
    return this.prisma.shift.findFirst({
      where: {
        userId,
        status: ShiftStatus.ACTIVE,
      },
      orderBy: {
        clockedInAt: 'desc',
      },
    });
  }

  async startShift(userId: string, startShiftDto: StartShiftDto) {
    const existingShift = await this.getActiveShift(userId);

    if (existingShift) {
      throw new ConflictException(
        'Kullanıcının zaten aktif bir vardiyası bulunuyor.',
      );
    }

    const scheduledStart = new Date(startShiftDto.scheduledStart);
    const scheduledEnd = new Date(startShiftDto.scheduledEnd);

    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException(
        'Vardiya bitiş saati başlangıç saatinden sonra olmalıdır.',
      );
    }

    const duration =
      scheduledEnd.getTime() - scheduledStart.getTime();

    if (duration > 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        'Vardiya süresi 24 saatten uzun olamaz.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const shift = await transaction.shift.create({
        data: {
          userId,
          scheduledStart,
          scheduledEnd,
          clockedInAt: new Date(),
          status: ShiftStatus.ACTIVE,
          note: startShiftDto.note,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: 'SHIFT_STARTED',
          entityType: 'Shift',
          entityId: shift.id,
          details: {
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
          },
        },
      });

      return shift;
    });
  }

  async endShift(userId: string) {
    const activeShift = await this.getActiveShift(userId);

    if (!activeShift) {
      throw new NotFoundException(
        'Sonlandırılabilecek aktif vardiya bulunamadı.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const shift = await transaction.shift.update({
        where: {
          id: activeShift.id,
        },
        data: {
          clockedOutAt: new Date(),
          status: ShiftStatus.COMPLETED,
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: 'SHIFT_ENDED',
          entityType: 'Shift',
          entityId: shift.id,
        },
      });

      return shift;
    });
  }
}