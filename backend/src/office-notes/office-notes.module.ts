import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OfficeNotesController } from './office-notes.controller';
import { OfficeNotesService } from './office-notes.service';

@Module({
  imports: [AuthModule],
  controllers: [OfficeNotesController],
  providers: [OfficeNotesService],
  exports: [OfficeNotesService],
})
export class OfficeNotesModule {}