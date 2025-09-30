import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { InternalService } from './internal.service';
import { AppService } from './app.service';
import { MemoryLeakGateway } from './memory-leak.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, InternalService, MemoryLeakGateway],
})
export class AppModule {}
