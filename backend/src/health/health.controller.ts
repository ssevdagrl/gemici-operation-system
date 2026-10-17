import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      application: 'BusOps Operasyon API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}