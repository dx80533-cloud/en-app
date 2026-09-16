import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';

@Module({
  controllers: [ListeningController],
  providers: [ListeningService],
})
export class ListeningModule {}
