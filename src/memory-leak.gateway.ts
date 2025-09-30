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
  
  // These collections store data for connected clients and system events
  private userSessions = new Map<string, UserSession>();
  private globalEventHandlers: Function[] = [];
  private messageHistory: Array<{ timestamp: Date; message: string; userId: string }> = [];

  // Background timer for periodic operations
  private globalTimer: NodeJS.Timeout;

  constructor() {
    // Start background operations when the gateway initializes
    this.globalTimer = setInterval(() => {
      // Regular maintenance operation that processes data
      this.performHeavyOperation();
    }, 5000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Allocate working memory for this connection's data processing
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

    // Set up heartbeat mechanism for connection monitoring
    const heartbeatCallback = () => {
      client.emit('heartbeat', { timestamp: Date.now() });
    };
    
    // Register event handlers for this client
    client.on('pong', heartbeatCallback);
    session.listeners.push({ event: 'pong', callback: heartbeatCallback });

    // Start periodic tasks for this connection
    const connectionTimer = setInterval(() => {
      // Log activity and maintain connection history
      this.messageHistory.push({
        timestamp: new Date(),
        message: `Ping from ${client.id}`,
        userId: session.userId,
      });
      
      if (this.messageHistory.length > 10000) {
        // Basic cleanup when history gets too large
        this.messageHistory = this.messageHistory.slice(-5000);
      }
    }, 1000);

    session.timers.push(connectionTimer);

    // Register global event handler for broadcasting
    const globalHandler = (data: any) => {
      // Handler that can send data to this specific client
      client.emit('global_broadcast', data);
    };
    this.globalEventHandlers.push(globalHandler);

    this.logMemoryUsage('After connection');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    const session = this.userSessions.get(client.id);
    
    if (session) {
      // Clean up some resources when client disconnects
      // TODO: Ensure all timers and intervals are properly cleared
      if (session.timers.length > 0) {
        clearInterval(session.timers[0]); // Clear the first timer
        // Note: Consider if all timers and intervals need cleanup
      }
      
      // TODO: Review what other cleanup might be needed
      // Consider: session data, event listeners, global handlers
      // Hint: What data structures are we adding to during connection?
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

    // Create a periodic update mechanism for this subscription
    const updateInterval = setInterval(() => {
      const updates = this.generateFakeUpdates(data.userId);
      client.emit('user_updates', updates);
    }, 2000);

    // Note: Consider how to track this interval for cleanup later
    // TODO: Think about where this interval should be stored for proper cleanup

    return { status: 'subscribed', userId: data.userId };
  }

  @SubscribeMessage('heavy_computation')
  async handleHeavyComputation(
    @MessageBody() data: { iterations: number },
    @ConnectedSocket() client: Socket,
  ) {
    // Process data in multiple iterations with callback functions
    const results: Array<() => void> = [];
    const largeData = Buffer.alloc(100 * 1024); // 100KB working data

    for (let i = 0; i < (data.iterations || 100); i++) {
      // Create processing functions that will handle the data
      results.push(() => {
        const processed = Buffer.concat([largeData, Buffer.from(`iteration_${i}`)]);
        client.emit('computation_result', { 
          iteration: i, 
          size: processed.length,
          timestamp: Date.now()
        });
      });
    }

    // Execute all processing functions
    results.forEach(fn => fn());
    
    // Keep a record of the computation in our message history
    // Consider: Should this history have limits? How does it grow over time?
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
    // Periodic maintenance task that processes system data
    const tempData = new Array(10000).fill(0).map((_, i) => ({
      id: i,
      data: Buffer.alloc(1024).toString('hex'),
      timestamp: Date.now(),
    }));

    // Process the temporary data
    tempData.forEach(item => {
      item.data = item.data.slice(0, 500);
    });

    this.logger.debug(`Heavy operation completed with ${tempData.length} items`);
  }

  private generateFakeUpdates(userId: string) {
    // Find the user session to include relevant data in updates
    const session = Array.from(this.userSessions.values()).find(s => s.userId === userId);
    
    return {
      userId,
      updates: new Array(50).fill(0).map((_, i) => ({
        id: i,
        message: `Update ${i} for ${userId}`,
        sessionData: session, // Include session context in the update
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