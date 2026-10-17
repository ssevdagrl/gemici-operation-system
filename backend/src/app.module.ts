import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { OfficeNotesModule } from './office-notes/office-notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { RidesModule } from './rides/rides.module';
import { ShiftsModule } from './shifts/shifts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 5,
      },
    ]),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ShiftsModule,
    RidesModule,
    AdminModule,
    OfficeNotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}