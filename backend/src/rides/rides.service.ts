import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideNoteDto } from './dto/create-ride-note.dto';
import { RideQueryDto } from './dto/ride-query.dto';
import { UpdateRideMarkerDto } from './dto/update-ride-marker.dto';

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: RideQueryDto) {
    const selectedDate = query.date
      ? new Date(`${query.date}T00:00:00`)
      : new Date();

    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const where: Prisma.RideWhereInput = {
      rideDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      ...(query.status && {
        status: query.status,
      }),
      ...(query.origin && {
        origin: {
          contains: query.origin,
          mode: 'insensitive',
        },
      }),
      ...(query.destination && {
        destination: {
          contains: query.destination,
          mode: 'insensitive',
        },
      }),
      ...(query.onlyStarred === 'true' && {
        markers: {
          some: {
            userId,
            isStarred: true,
          },
        },
      }),
      ...(query.onlyAlert === 'true' && {
        markers: {
          some: {
            userId,
            isAlert: true,
          },
        },
      }),
    };

    if (query.search) {
      where.OR = [
        {
          origin: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
  companyLineCode: {
    contains: query.search,
    mode: 'insensitive',
  },
},
        {
          destination: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          vehicle: {
            plate: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
        {
          vehicle: {
            callShortCode: {
              contains: query.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        vehicle: true,
        markers: {
          where: {
            userId,
          },
          select: {
            isStarred: true,
            isAlert: true,
          },
        },
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy: {
        plannedDeparture: 'asc',
      },
    });

    return rides.map(({ markers, ...ride }) => ({
      ...ride,
      isStarred: markers[0]?.isStarred ?? false,
      isAlert: markers[0]?.isAlert ?? false,
    }));
  }

    async findOne(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: {
        id: rideId,
      },
      include: {
        vehicle: true,
        passengers: {
          where: {
            isKocaeliPassenger: true,
          },
          orderBy: [
            {
              isCancelled: 'asc',
            },
            {
              seatNumber: 'asc',
            },
          ],
        },
        markers: {
          where: {
            userId,
          },
          select: {
            isStarred: true,
            isAlert: true,
          },
        },
        notes: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            notes: true,
            passengers: true,
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Sefer bulunamadı.');
    }

    const { markers, ...rideDetail } = ride;

    return {
      ...rideDetail,
      isStarred: markers[0]?.isStarred ?? false,
      isAlert: markers[0]?.isAlert ?? false,
    };
  }

  async updateMarker(
    userId: string,
    rideId: string,
    updateRideMarkerDto: UpdateRideMarkerDto,
  ) {
    const rideExists = await this.prisma.ride.findUnique({
      where: {
        id: rideId,
      },
      select: {
        id: true,
      },
    });

    if (!rideExists) {
      throw new NotFoundException('Sefer bulunamadı.');
    }

    return this.prisma.rideMarker.upsert({
      where: {
        rideId_userId: {
          rideId,
          userId,
        },
      },
      create: {
        rideId,
        userId,
        isStarred: updateRideMarkerDto.isStarred ?? false,
        isAlert: updateRideMarkerDto.isAlert ?? false,
      },
      update: {
        ...(updateRideMarkerDto.isStarred !== undefined && {
          isStarred: updateRideMarkerDto.isStarred,
        }),
        ...(updateRideMarkerDto.isAlert !== undefined && {
          isAlert: updateRideMarkerDto.isAlert,
        }),
      },
      select: {
        rideId: true,
        isStarred: true,
        isAlert: true,
      },
    });
  }

  async findNotes(rideId: string) {
    const rideExists = await this.prisma.ride.findUnique({
      where: {
        id: rideId,
      },
      select: {
        id: true,
      },
    });

    if (!rideExists) {
      throw new NotFoundException('Sefer bulunamadı.');
    }

    return this.prisma.rideNote.findMany({
      where: {
        rideId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createNote(
    authorId: string,
    rideId: string,
    createRideNoteDto: CreateRideNoteDto,
  ) {
    const content = createRideNoteDto.content.trim();

    if (!content) {
      throw new BadRequestException('Not boş bırakılamaz.');
    }

    const rideExists = await this.prisma.ride.findUnique({
      where: {
        id: rideId,
      },
      select: {
        id: true,
      },
    });

    if (!rideExists) {
      throw new NotFoundException('Sefer bulunamadı.');
    }

    const note = await this.prisma.rideNote.create({
      data: {
        rideId,
        authorId,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: authorId,
        action: 'RIDE_NOTE_CREATED',
        entityType: 'RideNote',
        entityId: note.id,
        details: {
          rideId,
        },
      },
    });

    return note;
  }
}