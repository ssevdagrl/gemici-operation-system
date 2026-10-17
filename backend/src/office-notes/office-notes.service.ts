import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeNoteDto } from './dto/create-office-note.dto';
import { UpdateOfficeNoteDto } from './dto/update-office-note.dto';

@Injectable()
export class OfficeNotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    const now = new Date();

    return this.prisma.officeNote.findMany({
      where: {
        isActive: true,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      select: {
        id: true,
        content: true,
        isPinned: true,
        isActive: true,
        expiresAt: true,
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
      orderBy: [
        {
          isPinned: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async create(
    authorId: string,
    createOfficeNoteDto: CreateOfficeNoteDto,
  ) {
    const content = createOfficeNoteDto.content.trim();

    if (!content) {
      throw new BadRequestException('Not boş bırakılamaz.');
    }

    const expiresAt = createOfficeNoteDto.expiresAt
      ? new Date(createOfficeNoteDto.expiresAt)
      : null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Notun sona erme tarihi gelecekte olmalıdır.',
      );
    }

    const note = await this.prisma.officeNote.create({
      data: {
        authorId,
        content,
        expiresAt,
      },
      select: {
        id: true,
        content: true,
        isPinned: true,
        isActive: true,
        expiresAt: true,
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
        action: 'OFFICE_NOTE_CREATED',
        entityType: 'OfficeNote',
        entityId: note.id,
      },
    });

    return note;
  }

  async update(
    actorId: string,
    noteId: string,
    updateOfficeNoteDto: UpdateOfficeNoteDto,
  ) {
    const existingNote =
      await this.prisma.officeNote.findUnique({
        where: {
          id: noteId,
        },
        select: {
          id: true,
        },
      });

    if (!existingNote) {
      throw new NotFoundException(
        'Yazıhane notu bulunamadı.',
      );
    }

    const note = await this.prisma.officeNote.update({
      where: {
        id: noteId,
      },
      data: {
        ...(updateOfficeNoteDto.isPinned !== undefined && {
          isPinned: updateOfficeNoteDto.isPinned,
        }),
        ...(updateOfficeNoteDto.isActive !== undefined && {
          isActive: updateOfficeNoteDto.isActive,
        }),
      },
      select: {
        id: true,
        content: true,
        isPinned: true,
        isActive: true,
        expiresAt: true,
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
        actorId,
        action:
          updateOfficeNoteDto.isActive === false
            ? 'OFFICE_NOTE_REMOVED'
            : 'OFFICE_NOTE_UPDATED',
        entityType: 'OfficeNote',
        entityId: note.id,
        details: {
          isPinned: note.isPinned,
          isActive: note.isActive,
        },
      },
    });

    return note;
  }
}