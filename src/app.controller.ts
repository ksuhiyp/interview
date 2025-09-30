import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { InternalService } from './internal.service';
import type { Response } from 'express';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly internalService: InternalService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('race-increment')
  async raceIncrement(): Promise<{ endpoint: string; value: number }> {
    const value = await this.appService.incrementRaceCondition();
    return { endpoint: 'race-increment', value };
  }

  @Get('safe-increment')
  async safeIncrement(): Promise<{ endpoint: string; value: number }> {
    const response = await this.internalService.safeIncrement();
    return response;
  }

  /**
   * Endpoint that reads file synchronously, causing backpressure/blocking
   */
  @Get('backpressure-sync')
  async backpressureSync(): Promise<{ bytes: number; duration: number }> {
    return this.appService.backpressureSync();
  }

  @Get('backpressure-stream')
  streamBackpressure(@Res() res: Response): void {
    this.internalService.streamBackpressure(res);
  }

  /**
   * Serve the memory leak challenge test page
   */
  @Get('memory-leak-challenge')
  serveMemoryLeakChallenge(@Res() res: Response): void {
    res.sendFile(path.join(process.cwd(), 'public', 'memory-leak-test.html'));
  }
}
