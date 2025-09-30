import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface UserSession {
  userId: string;
  socketId: string;
  data: Buffer; // Large data to amplify memory usage
  timers: NodeJS.Timeout[];
  intervals: NodeJS.Timeout[];
  listeners: Array<{ event: string; callback: Function }>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MemoryLeakGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MemoryLeakGateway.name);
  
  // MEMORY LEAK PATTERN 1: Growing collections without cleanup
  private userSessions = new Map<string, UserSession>();
  private globalEventHandlers: Function[] = [];
  private messageHistory: Array<{ timestamp: Date; message: string; userId: string }> = [];

  // MEMORY LEAK PATTERN 2: Static timers that reference instance methods
  private globalTimer: NodeJS.Timeout;

  constructor() {
    // MEMORY LEAK PATTERN 3: Constructor timer that never gets cleared
    this.globalTimer = setInterval(() => {
      // This creates a closure that holds reference to 'this'
      this.performHeavyOperation();
    }, 5000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // MEMORY LEAK PATTERN 4: Creating large buffers per connection
    const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB per connection
    largeBuffer.fill('x');

    const session: UserSession = {
      userId: client.handshake.auth?.userId || `anonymous_${Date.now()}`,
      socketId: client.id,
      data: largeBuffer,
      timers: [],
      intervals: [],
      listeners: [],
    };

    this.userSessions.set(client.id, session);

    // MEMORY LEAK PATTERN 5: Event listeners that accumulate
    const heartbeatCallback = () => {
      client.emit('heartbeat', { timestamp: Date.now() });
    };
    
    // Adding listeners without proper cleanup tracking
    client.on('pong', heartbeatCallback);
    session.listeners.push({ event: 'pong', callback: heartbeatCallback });

    // MEMORY LEAK PATTERN 6: Timers per connection without cleanup
    const connectionTimer = setInterval(() => {
      // Keep adding to message history without bounds
      this.messageHistory.push({
        timestamp: new Date(),
        message: `Ping from ${client.id}`,
        userId: session.userId,
      });
      
      if (this.messageHistory.length > 10000) {
        // Naive cleanup that doesn't actually help much
        this.messageHistory = this.messageHistory.slice(-5000);
      }
    }, 1000);

    session.timers.push(connectionTimer);

    // MEMORY LEAK PATTERN 7: Global handlers that reference specific sockets
    const globalHandler = (data: any) => {
      // This function captures the client in closure
      client.emit('global_broadcast', data);
    };
    this.globalEventHandlers.push(globalHandler);

    this.logMemoryUsage('After connection');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    const session = this.userSessions.get(client.id);
    
    if (session) {
      // MEMORY LEAK PATTERN 8: Incomplete cleanup
      // Only clearing some timers, not all
      if (session.timers.length > 0) {
        clearInterval(session.timers[0]); // Only clearing first timer!
        // Missing: clear all timers and intervals
      }
      
      // MEMORY LEAK PATTERN 9: Not removing from collections
      // Missing: this.userSessions.delete(client.id);
      // Missing: removing from globalEventHandlers
      // Missing: removing event listeners
    }

    this.logMemoryUsage('After disconnection');
  }

  @SubscribeMessage('subscribe_updates')
  handleSubscribeUpdates(
    @MessageBody() data: { userId: string; preferences: any },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.userSessions.get(client.id);
    if (!session) return;

    // MEMORY LEAK PATTERN 10: Creating new intervals on each subscription
    const updateInterval = setInterval(() => {
      const updates = this.generateFakeUpdates(data.userId);
      client.emit('user_updates', updates);
    }, 2000);

    // Should add to session.intervals for cleanup, but we "forget" to do this
    // session.intervals.push(updateInterval);

    return { status: 'subscribed', userId: data.userId };
  }

  @SubscribeMessage('heavy_computation')
  async handleHeavyComputation(
    @MessageBody() data: { iterations: number },
    @ConnectedSocket() client: Socket,
  ) {
    // MEMORY LEAK PATTERN 11: Creating closures in loops with large data
    const results: Array<() => void> = [];
    const largeData = Buffer.alloc(100 * 1024); // 100KB

    for (let i = 0; i < (data.iterations || 100); i++) {
      // Each function captures largeData and i
      results.push(() => {
        const processed = Buffer.concat([largeData, Buffer.from(`iteration_${i}`)]);
        client.emit('computation_result', { 
          iteration: i, 
          size: processed.length,
          timestamp: Date.now()
        });
      });
    }

    // Execute all at once, keeping references
    results.forEach(fn => fn());
    
    // MEMORY LEAK PATTERN 12: Storing results without bounds
    // In a real app, this might be a cache that grows indefinitely
    this.messageHistory.push({
      timestamp: new Date(),
      message: `Heavy computation completed: ${results.length} operations`,
      userId: data.iterations.toString(),
    });

    return { processed: results.length };
  }

  @SubscribeMessage('get_memory_stats')
  handleGetMemoryStats(@ConnectedSocket() client: Socket) {
    const memUsage = process.memoryUsage();
    const stats = {
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
      },
      activeSessions: this.userSessions.size,
      messageHistoryLength: this.messageHistory.length,
      globalHandlers: this.globalEventHandlers.length,
    };

    client.emit('memory_stats', stats);
    return stats;
  }

  @SubscribeMessage('force_gc')
  handleForceGC(@ConnectedSocket() client: Socket) {
    // This requires Node.js to be started with --expose-gc flag
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      client.emit('gc_result', {
        before: Math.round(before.heapUsed / 1024 / 1024),
        after: Math.round(after.heapUsed / 1024 / 1024),
        freed: Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024),
      });
    } else {
      client.emit('gc_result', { 
        error: 'GC not exposed. Start with --expose-gc flag' 
      });
    }
  }

  private performHeavyOperation() {
    // MEMORY LEAK PATTERN 13: Creating temporary large objects frequently
    const tempData = new Array(10000).fill(0).map((_, i) => ({
      id: i,
      data: Buffer.alloc(1024).toString('hex'),
      timestamp: Date.now(),
    }));

    // Simulate some processing
    tempData.forEach(item => {
      item.data = item.data.slice(0, 500);
    });

    this.logger.debug(`Heavy operation completed with ${tempData.length} items`);
  }

  private generateFakeUpdates(userId: string) {
    // MEMORY LEAK PATTERN 14: Creating new objects with references to session data
    const session = Array.from(this.userSessions.values()).find(s => s.userId === userId);
    
    return {
      userId,
      updates: new Array(50).fill(0).map((_, i) => ({
        id: i,
        message: `Update ${i} for ${userId}`,
        sessionData: session, // This creates a circular reference!
        timestamp: Date.now(),
      })),
    };
  }

  private logMemoryUsage(context: string) {
    const usage = process.memoryUsage();
    this.logger.log(
      `${context} - Heap: ${Math.round(usage.heapUsed / 1024 / 1024)}MB, ` +
      `Sessions: ${this.userSessions.size}, ` +
      `History: ${this.messageHistory.length}`
    );
  }
}