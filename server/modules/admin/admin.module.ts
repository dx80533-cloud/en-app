import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ExampleFillerService } from './example-filler.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ExampleFillerService],
})
export class AdminModule {}
