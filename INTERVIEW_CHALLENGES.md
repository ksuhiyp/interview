# Backend Interview Challenges

A comprehensive set of backend development challenges designed to test candidate skills in Node.js, NestJS, and general backend knowledge.

## Overview

This repository contains multiple challenges that test different aspects of backend development:

1. **Race Condition Challenge** - Database concurrency and transaction handling
2. **Backpressure Challenge** - Stream processing and performance optimization
3. **Memory Leak Challenge** - Socket.IO lifecycle management and memory debugging

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js v18+ (for local development)
- Basic understanding of JavaScript/TypeScript

### Running the Challenges

**Start with Docker (Recommended):**
```bash
docker-compose up --build
```

**Access the challenges:**
- Main API: http://localhost:3000
- Memory Leak Challenge UI: http://localhost:3000/memory-leak-challenge
- Database Admin: http://localhost:8081
- Automated Test Script: `./test-memory-leaks.sh`

**Database credentials:**
- Host: db (or localhost:3306 from host)
- Database: interview
- User: interview
- Password: interview123

## Testing Workflow

### Quick Test (5 minutes)
1. Start Docker: `docker-compose up --build`
2. Open Memory Leak UI: http://localhost:3000/memory-leak-challenge
3. Test race conditions: `curl http://localhost:3000/race-increment`
4. Test backpressure: `curl http://localhost:3000/backpressure-sync`

### Comprehensive Test (15-30 minutes)
1. Run automated script: `./test-memory-leaks.sh`
2. Use the web interface for interactive testing
3. Monitor memory with: `docker stats interview-app`
4. Test all three challenge areas systematically

## Challenge 1: Race Condition

**Objective:** Understand database concurrency issues and implement proper transaction handling.

### Test Endpoints

**Unsafe increment (demonstrates race condition):**
```bash
seq 1 5 | xargs -P5 -I{} sh -c 'curl -s http://localhost:3000/race-increment | jq .'
```

**Safe increment (proper transaction handling):**
```bash
seq 1 5 | xargs -P5 -I{} sh -c 'curl -s http://localhost:3000/safe-increment | jq .'
```

### What to Observe
- Unsafe endpoint: Lost updates due to race conditions
- Safe endpoint: Consistent increments using row-level locking
- Database transaction patterns and isolation levels

### Key Learning Points
- Database transaction management
- Row-level locking with `SELECT ... FOR UPDATE`
- Concurrency control in multi-user scenarios
- MySQL connection pooling

## Challenge 2: Backpressure Handling

**Objective:** Understand Node.js streaming, blocking operations, and backpressure management.

### Test Endpoints

**Blocking synchronous file read:**
```bash
curl -s http://localhost:3000/backpressure-sync | jq .
```

**Non-blocking streaming with backpressure:**
```bash
curl http://localhost:3000/backpressure-stream
```

### What to Observe
- Sync endpoint: Blocks the event loop during file reading
- Stream endpoint: Handles backpressure and doesn't block
- Performance differences and resource utilization

### Key Learning Points
- Event loop blocking vs non-blocking operations
- Stream-based processing for large data
- Backpressure handling patterns
- Memory-efficient file processing

## Challenge 3: Memory Leak Detection and Prevention

**Objective:** Identify and fix memory leaks in a Socket.IO real-time application.

### Access the Challenge

#### Interactive Web Interface
The memory leak challenge includes a comprehensive web-based testing interface:

**URL:** http://localhost:3000/memory-leak-challenge

**Features:**
- Real-time memory statistics display
- Multiple connection simulation
- Heavy computation triggers
- Memory leak scenario testing
- Built-in garbage collection controls
- Live event logging

**How to use:**
1. Open the URL in your browser after starting Docker
2. Click "Connect" to establish a WebSocket connection
3. Use the test scenarios:
   - **Subscribe to Updates**: Creates intervals that leak memory
   - **Heavy Computation**: Triggers closure-based memory leaks
   - **Create 10 Connections**: Simulates multiple clients
   - **Get Memory Stats**: Shows current server memory usage
   - **Force Garbage Collection**: Triggers manual GC (requires --expose-gc)
4. Monitor the memory statistics panel for changes
5. Observe the event log for real-time activity

#### Automated Testing Script
For systematic testing and monitoring:

**Command:** `./test-memory-leaks.sh`

**Script features:**
- Container memory monitoring
- Automated test scenarios
- Memory leak detection
- Environment reset capabilities
- Browser integration

**Menu options:**
1. **Get current memory stats** - Shows Docker container memory usage
2. **Open memory leak challenge UI** - Launches browser automatically
3. **Simulate 10 HTTP connections** - Stress test with multiple requests
4. **Monitor container stats** - Real-time memory monitoring
5. **Check for memory leaks** - Before/after memory comparison
6. **Force garbage collection** - Trigger GC via API
7. **Reset test environment** - Restart container for clean state
8. **Exit** - Quit the script

**Usage example:**
```bash
# Make script executable (if not already)
chmod +x test-memory-leaks.sh

# Run the interactive menu
./test-memory-leaks.sh

# For automated monitoring in background
docker stats interview-app --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

### Memory Leak Patterns to Identify

The Socket.IO server contains these intentional memory leak patterns:

#### 1. Growing Collections Without Cleanup
- `userSessions` Map grows but entries are never removed
- `messageHistory` array accumulates messages indefinitely
- `globalEventHandlers` array keeps adding handlers

#### 2. Timer and Interval Leaks
- Constructor creates a global timer that's never cleared
- Per-connection timers are only partially cleaned up
- Subscription intervals are created but not tracked for cleanup

#### 3. Event Listener Accumulation
- Socket event listeners are added but not removed on disconnect
- Global handlers capture specific socket references

#### 4. Large Buffer Allocations
- 1MB buffer allocated per connection
- Temporary large objects created frequently
- Heavy computation creates many closure-captured objects

#### 5. Circular References
- Session data includes references that create circular dependencies
- Update objects reference session data creating retention cycles

#### 6. Closure Memory Capture
- Loops create closures that capture large data objects
- Global handlers capture socket instances in closures

### Testing Scenarios

#### For Candidates - Step-by-Step Testing

**Phase 1: Initial Analysis (10 minutes)**
1. Open the web interface: http://localhost:3000/memory-leak-challenge
2. Connect to the server and observe baseline memory stats
3. Review the Socket.IO gateway code in `src/memory-leak.gateway.ts`
4. Identify potential memory leak patterns in the code

**Phase 2: Memory Leak Reproduction (15 minutes)**
1. **Single Client Test:**
   - Connect one client
   - Subscribe to updates
   - Monitor memory growth for 2-3 minutes
   - Note any memory increases

2. **Multiple Client Test:**
   - Use "Create 10 Connections" button
   - Trigger heavy computation on multiple clients
   - Watch memory statistics climb
   - Disconnect all clients and check if memory returns to baseline

3. **Stress Test:**
   - Repeat connection/disconnection cycles
   - Use the automated script: `./test-memory-leaks.sh` (option 3)
   - Monitor with: `docker stats interview-app`

**Phase 3: Memory Leak Fixes (20-30 minutes)**
1. Implement fixes in `src/memory-leak.gateway.ts`
2. Focus on the `handleDisconnect` method
3. Add proper cleanup for:
   - Timers and intervals
   - Event listeners
   - Collection entries
   - Global handlers

**Phase 4: Verification (10 minutes)**
1. Restart the application: `docker-compose restart app`
2. Repeat the memory leak tests
3. Verify memory returns to baseline after disconnections
4. Use "Force Garbage Collection" to test cleanup effectiveness

#### For Interviewers - Evaluation Points

**Observe candidate's approach:**
- Do they read the code before testing?
- Do they use systematic testing methods?
- Do they monitor memory during tests?
- Do they verify their fixes work?

**Technical assessment:**
- Can they identify all 14 memory leak patterns?
- Do they implement comprehensive cleanup?
- Do they understand the root causes?
- Can they explain the fixes clearly?

### Test Scenarios

#### Basic Memory Leak Test
1. Connect a single client
2. Subscribe to updates
3. Trigger heavy computation
4. Monitor memory growth
5. Disconnect and observe if memory is freed

#### Stress Test
1. Create multiple connections (use "Create 10 Connections" button)
2. Have each connection subscribe to updates
3. Trigger heavy computations on multiple clients
4. Monitor memory growth across connections
5. Disconnect all clients and check for memory retention

#### Memory Pressure Test
1. Repeat connection/disconnection cycles
2. Monitor memory baseline between cycles
3. Check if memory returns to baseline after GC
4. Identify retained objects

### Monitoring Tools

#### Built-in Memory Stats
The interface provides real-time memory statistics:
- **RSS**: Resident Set Size (total memory used by process)
- **Heap Used**: Memory used by JavaScript objects
- **Heap Total**: Total heap allocated by V8
- **External**: Memory used by C++ objects bound to JavaScript
- **Active Sessions**: Number of connected clients
- **Message History Length**: Number of stored messages
- **Global Handlers**: Number of global event handlers

#### Docker Container Monitoring
```bash
# Real-time memory monitoring
docker stats interview-app

# Get detailed memory information
docker exec interview-app sh -c "free -m"

# Check Node.js process memory
docker exec interview-app sh -c "ps aux | grep node"

# Monitor specific process details
docker exec interview-app sh -c "cat /proc/\$(pidof node)/status | grep -E '(VmRSS|VmSize|VmPeak)'"
```

#### Advanced Profiling
```bash
# For heap analysis (local development)
node --max-old-space-size=4096 --expose-gc --inspect dist/main.js

# Connect Chrome DevTools to localhost:9229 for heap snapshots

# For Docker with debugging
docker run -p 3000:3000 -p 9229:9229 \
  interview-app \
  node --max-old-space-size=4096 --expose-gc --inspect=0.0.0.0:9229 dist/main.js
```

### Expected Fixes

Candidates should implement these cleanup patterns:

#### 1. Proper Disconnect Handling
```typescript
handleDisconnect(client: Socket) {
  const session = this.userSessions.get(client.id);
  
  if (session) {
    // Clear all timers and intervals
    session.timers.forEach(timer => clearTimeout(timer));
    session.intervals.forEach(interval => clearInterval(interval));
    
    // Remove event listeners
    session.listeners.forEach(({event, callback}) => {
      client.removeListener(event, callback);
    });
    
    // Remove from collections
    this.userSessions.delete(client.id);
  }
  
  // Clean up global handlers
  this.globalEventHandlers = this.globalEventHandlers.filter(
    handler => !handler.toString().includes(client.id)
  );
}
```

#### 2. Resource Tracking
```typescript
// Track all resources in session object
interface UserSession {
  userId: string;
  socketId: string;
  data: Buffer;
  timers: NodeJS.Timeout[];
  intervals: NodeJS.Timeout[];
  listeners: Array<{ event: string; callback: Function }>;
}

// Add resources to tracking when created
const interval = setInterval(() => { /* ... */ }, 1000);
session.intervals.push(interval);
```

#### 3. Bounded Collections
```typescript
// Implement proper bounds for message history
private addToMessageHistory(message: any) {
  this.messageHistory.push(message);
  
  // Keep only last 1000 messages
  if (this.messageHistory.length > 1000) {
    this.messageHistory = this.messageHistory.slice(-1000);
  }
}
```

#### 4. Break Circular References
```typescript
// Avoid including session data in response objects
private generateFakeUpdates(userId: string) {
  return {
    userId,
    updates: new Array(50).fill(0).map((_, i) => ({
      id: i,
      message: `Update ${i} for ${userId}`,
      // Don't include sessionData reference
      timestamp: Date.now(),
    })),
  };
}
```

## Development Setup

### Local Development
```bash
# Install dependencies
npm install

# Start in development mode with memory leak debugging
npm run start:dev -- --expose-gc --max-old-space-size=4096

# Run tests
npm run test
npm run test:e2e
```

### Docker Development
```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Evaluation Criteria

### Race Condition Challenge
- Understanding of database transactions
- Knowledge of concurrency control mechanisms
- Ability to identify and prevent race conditions
- Understanding of connection pooling

### Backpressure Challenge
- Knowledge of Node.js event loop and blocking operations
- Understanding of streams and backpressure
- Performance optimization awareness
- Memory-efficient programming practices

### Memory Leak Challenge
- **Code Analysis Skills**: Can identify leak patterns by reading code
- **Debugging Approach**: Uses appropriate tools and systematic debugging
- **Memory Management Understanding**: Understands JavaScript memory model
- **Real-time Systems Knowledge**: Understands Socket.IO lifecycle management
- **Testing and Verification**: Properly tests fixes
- **Performance Awareness**: Considers performance implications of fixes

## Success Criteria

A successful candidate should demonstrate:

1. **Memory Stability**: Memory usage returns to baseline after disconnecting clients
2. **No Resource Leaks**: All timers, intervals, and event listeners are properly cleaned up
3. **Bounded Growth**: Collections have reasonable size limits
4. **GC Effectiveness**: Garbage collection frees most allocated memory
5. **Performance**: Server handles connect/disconnect cycles without degradation

## Common Mistakes to Watch For

1. **Incomplete Cleanup**: Only fixing some leaks but missing others
2. **Over-Engineering**: Creating complex solutions for simple cleanup problems
3. **Not Testing**: Making changes without verifying they actually fix the issues
4. **Ignoring Performance**: Fixes that prevent leaks but hurt performance
5. **Missing Edge Cases**: Not handling error scenarios in cleanup code

## Advanced Challenges (For Senior Candidates)

1. **Memory Pool Implementation**: Implement object pooling for frequently allocated objects
2. **Weak References**: Use WeakMap/WeakSet where appropriate
3. **Streaming Optimizations**: Implement backpressure handling for large data streams
4. **Memory Monitoring**: Add automated memory leak detection and alerting
5. **Load Testing**: Test with hundreds of concurrent connections

## Architecture

The application is built with:
- **NestJS** - Progressive Node.js framework
- **Socket.IO** - Real-time bidirectional event-based communication
- **MySQL** - Relational database with transaction support
- **Docker** - Containerized development and deployment
- **TypeScript** - Type-safe JavaScript development

This comprehensive challenge set effectively tests real-world debugging and optimization skills crucial for maintaining scalable Node.js applications.