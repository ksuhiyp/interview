import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { AppModule } from '../src/app.module';

describe('MemoryLeakGateway (e2e)', () => {
  let app: INestApplication;
  let clientSocket: ClientSocket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3001); // Use different port for testing
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    clientSocket = io('http://localhost:3001', {
      auth: { userId: 'test-user' },
    });
    
    return new Promise<void>((resolve) => {
      clientSocket.on('connect', () => {
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('should connect successfully', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });

  it('should handle subscribe_updates event', (done) => {
    clientSocket.emit('subscribe_updates', {
      userId: 'test-user',
      preferences: { notifications: true },
    });

    clientSocket.on('user_updates', (data) => {
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('updates');
      expect(Array.isArray(data.updates)).toBe(true);
      done();
    });
  });

  it('should handle heavy_computation event', (done) => {
    const iterations = 10;
    let resultsReceived = 0;

    clientSocket.emit('heavy_computation', { iterations });

    clientSocket.on('computation_result', (data) => {
      expect(data).toHaveProperty('iteration');
      expect(data).toHaveProperty('size');
      expect(data).toHaveProperty('timestamp');
      
      resultsReceived++;
      
      if (resultsReceived === iterations) {
        done();
      }
    });
  });

  it('should return memory stats', (done) => {
    clientSocket.emit('get_memory_stats');

    clientSocket.on('memory_stats', (stats) => {
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('messageHistoryLength');
      expect(stats).toHaveProperty('globalHandlers');
      expect(stats.activeSessions).toBeGreaterThan(0);
      done();
    });
  });
});