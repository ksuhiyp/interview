import { Injectable, OnModuleInit } from '@nestjs/common';
import { createPool, Pool } from 'mysql2/promise';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InternalService implements OnModuleInit {
  private pool: Pool;

  onModuleInit(): void {
    this.pool = createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });
    this.initCounter();
  }

  private async initCounter() {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS counter (id INT PRIMARY KEY, value INT)`
    );
    await this.pool.query(
      `INSERT IGNORE INTO counter (id, value) VALUES (1, 0)`
    );
  }

  /**
   * Private safe increment using transaction and row-level locking
   */
  async safeIncrement(): Promise<{ endpoint: string; value: number }> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query<any[]>(
        'SELECT value FROM counter WHERE id = 1 FOR UPDATE'
      );
      const current = rows[0].value;
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      const next = current + 1;
      await conn.query('UPDATE counter SET value = ? WHERE id = 1', [next]);
      await conn.commit();
      return { endpoint: 'safeIncrement', value: next };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Stream file with backpressure handling
   */
  streamBackpressure(res: Response): void {
    const filePath = path.join(process.cwd(), 'large.txt');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'x'.repeat(1 * 1024 * 1024));
    }
    console.log('InternalService starting stream read...');
    const start = Date.now();
    const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
    res.setHeader('Content-Type', 'text/plain');
    readStream.on('data', (chunk) => {
      console.log(`InternalService read chunk ${chunk.length}`);
      const canContinue = res.write(chunk);
      if (!canContinue) {
        console.log('InternalService backpressure: pausing');
        readStream.pause();
        res.once('drain', () => {
          console.log('InternalService drain: resuming');
          readStream.resume();
        });
      }
    });
    readStream.on('end', () => {
      const duration = Date.now() - start;
      console.log(`InternalService stream ended in ${duration}ms`);
      res.end();
    });
    readStream.on('error', (err) => {
      console.error('InternalService stream error', err);
      res.status(500).end();
    });
  }
}
