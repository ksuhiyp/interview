import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { InternalService } from './internal.service';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, InternalService],
})
export class AppModule {}
