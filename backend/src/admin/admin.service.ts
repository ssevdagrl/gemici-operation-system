import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        shifts: {
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            scheduledStart: true,
            scheduledEnd: true,
            clockedInAt: true,
            clockedOutAt: true,
            status: true,
            note: true,
          },
          orderBy: {
            clockedInAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            shifts: true,
          },
        },
      },
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          fullName: 'asc',
        },
      ],
    });
  }

  async createUser(
    actorId: string,
    createUserDto: CreateUserDto,
  ) {
    const username = createUserDto.username
      .trim()
      .toLocaleLowerCase('tr-TR');

    const fullName = createUserDto.fullName.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Bu kullanıcı adı zaten kullanılıyor.',
      );
    }

    const passwordHash = await argon2.hash(
      createUserDto.password,
    );

    const user = await this.prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash,
        role: createUserDto.role ?? UserRole.EMPLOYEE,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: {
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });

    return user;
  }

  async updateUserStatus(
    actorId: string,
    userId: string,
    updateUserStatusDto: UpdateUserStatusDto,
  ) {
    if (
      actorId === userId &&
      updateUserStatusDto.isActive === false
    ) {
      throw new BadRequestException(
        'Kendi yönetici hesabınızı pasifleştiremezsiniz.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive: updateUserStatusDto.isActive,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: user.isActive
          ? 'USER_ACTIVATED'
          : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: user.id,
        details: {
          username: user.username,
          previousStatus: existingUser.isActive,
          newStatus: user.isActive,
        },
      },
    });

    return user;
  }

  async findShiftHistory() {
    return this.prisma.shift.findMany({
      select: {
        id: true,
        scheduledStart: true,
        scheduledEnd: true,
        clockedInAt: true,
        clockedOutAt: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        scheduledStart: 'desc',
      },
      take: 100,
    });
  }
}