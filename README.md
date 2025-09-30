# Backend Interview Challenges

A comprehensive set of backend development challenges designed to test candidate skills in Node.js, NestJS, database transactions, streaming, and memory management.

## Quick Start

```bash
# Start all services with Docker
docker-compose up --build
```

**Access the challenges:**
- Main API: http://localhost:3000
- Memory Leak Challenge: http://localhost:3000/memory-leak-challenge
- Database Admin: http://localhost:8081
- **Automated Test Script: `./test-memory-leaks.sh`**

## Quick Testing

**Memory Leak Challenge (Interactive):**
```bash
# Start the application
docker-compose up --build

# Open web interface
open http://localhost:3000/memory-leak-challenge
# OR use automated script
./test-memory-leaks.sh
```

**Race Condition Challenge:**
```bash
# Test unsafe increment
seq 1 5 | xargs -P5 -I{} sh -c 'curl -s http://localhost:3000/race-increment | jq .'

# Test safe increment  
seq 1 5 | xargs -P5 -I{} sh -c 'curl -s http://localhost:3000/safe-increment | jq .'
```

**Backpressure Challenge:**
```bash
# Test blocking operation
curl -s http://localhost:3000/backpressure-sync | jq .

# Test streaming
curl http://localhost:3000/backpressure-stream
```

## Challenges

1. **Race Condition Challenge** - Database concurrency and transaction handling
2. **Backpressure Challenge** - Stream processing and performance optimization  
3. **Memory Leak Challenge** - Socket.IO lifecycle management and memory debugging

## Complete Documentation

📖 **See [INTERVIEW_CHALLENGES.md](./INTERVIEW_CHALLENGES.md) for detailed instructions, test scenarios, and evaluation criteria.**

## Project Structure

```
├── src/
│   ├── app.controller.ts      # REST API endpoints
│   ├── app.service.ts         # Race condition & backpressure demos
│   ├── internal.service.ts    # Safe database operations
│   ├── memory-leak.gateway.ts # Socket.IO with intentional memory leaks
│   └── main.ts               # Application entry point
├── public/
│   └── memory-leak-test.html  # Interactive memory leak testing UI
├── test/
│   ├── app.e2e-spec.ts       # REST API tests
│   └── memory-leak.e2e-spec.ts # Socket.IO tests
├── docker-compose.yml         # Multi-service Docker setup
├── test-memory-leaks.sh      # Automated memory testing script
└── INTERVIEW_CHALLENGES.md   # Complete documentation
```

## Development

```bash
# Local development
npm install
npm run start:dev

# Testing
npm run test
npm run test:e2e

# Memory leak testing with debugging
npm run start:dev -- --expose-gc --max-old-space-size=4096
```

This interview setup tests real-world skills essential for building scalable Node.js applications.
