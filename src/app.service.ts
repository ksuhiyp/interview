import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { createPool, Pool } from 'mysql2/promise';

@Injectable()
export class AppService implements OnModuleInit {
  private pool: Pool;

  onModuleInit(): void {
    // Initialize connection pool
    this.pool = createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
    });
    // Ensure counter table exists
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

  // Race condition increment (no locking)
  async incrementRaceCondition(): Promise<number> {
    // Read current value without locking
    const [rows] = await this.pool.query<any[]>(
      'SELECT value FROM counter WHERE id = 1'
    );
    const current = rows[0].value;

    // Simulate delay to expose race condition
    await new Promise((resolve) => setTimeout(resolve, 10));

    const next = current + 1;
    // Update value back to DB
    await this.pool.query(
      'UPDATE counter SET value = ? WHERE id = 1',
      [next]
    );
    return next;
  }

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Read file synchronously to demonstrate blocking/backpressure
   */
  async backpressureSync(): Promise<{ bytes: number; duration: number }> {
    const filePath = path.join(process.cwd(), 'larg.txt');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, 'x'.repeat(1 * 1024 * 1024 * 500)); // 1MB
    }
    console.log('Starting sync read in service...');
    const start = Date.now();
    const data = fs.readFileSync(filePath);
    const duration = Date.now() - start;
    console.log(`Service sync read completed in ${duration}ms, bytes: ${data.length}`);
    return { bytes: data.length, duration };
  }

  /**
   * Stream file with backpressure handling
   */
}
