#!/bin/bash

# Memory Leak Challenge Test Script
# This script helps automate memory leak testing scenarios
# See INTERVIEW_CHALLENGES.md for complete documentation

set -e

echo "🧠 Memory Leak Challenge Test Script"
echo "===================================="
echo "📖 Full documentation: INTERVIEW_CHALLENGES.md"
echo ""

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if the service is running
if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "❌ Service is not running on localhost:3000"
    echo "   Please run: docker-compose up --build"
    exit 1
fi

echo "✅ Service is running on localhost:3000"

# Function to get memory stats
get_memory_stats() {
    echo "📊 Current Memory Stats:"
    docker stats interview-app --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | tail -n 1
}

# Function to simulate multiple connections
simulate_connections() {
    local count=$1
    echo "🔗 Simulating $count concurrent connections..."
    
    for i in $(seq 1 $count); do
        (
            echo "Connecting client $i..."
            curl -s http://localhost:3000/memory-leak-challenge >/dev/null &
        ) &
    done
    
    wait
    echo "✅ Simulation complete"
}

# Main menu
while true; do
    echo ""
    echo "Choose a test scenario:"
    echo "1) Get current memory stats"
    echo "2) Open memory leak challenge UI in browser"
    echo "3) Simulate 10 HTTP connections"
    echo "4) Monitor container stats (real-time)"
    echo "5) Check for memory leaks in container"
    echo "6) Force garbage collection via API"
    echo "7) Reset test environment"
    echo "8) Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1)
            get_memory_stats
            ;;
        2)
            echo "🌐 Opening memory leak challenge UI..."
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open http://localhost:3000/memory-leak-challenge
            elif command -v open >/dev/null 2>&1; then
                open http://localhost:3000/memory-leak-challenge
            else
                echo "Please open http://localhost:3000/memory-leak-challenge in your browser"
            fi
            ;;
        3)
            get_memory_stats
            simulate_connections 10
            sleep 2
            get_memory_stats
            ;;
        4)
            echo "📈 Monitoring container stats (Press Ctrl+C to stop)..."
            docker stats interview-app
            ;;
        5)
            echo "🔍 Checking for memory leaks..."
            echo "Memory usage before test:"
            get_memory_stats
            
            echo "Triggering memory-intensive operations..."
            curl -s http://localhost:3000/memory-leak-challenge >/dev/null
            
            echo "Memory usage after test:"
            get_memory_stats
            
            echo "Container process information:"
            docker exec interview-app sh -c "ps aux | grep node | head -1"
            ;;
        6)
            echo "🗑️ Attempting to force garbage collection..."
            response=$(curl -s -X POST http://localhost:3000/force-gc 2>/dev/null || echo "Endpoint not available")
            echo "Response: $response"
            get_memory_stats
            ;;
        7)
            echo "🔄 Resetting test environment..."
            echo "Restarting container..."
            docker-compose restart app
            echo "Waiting for service to be ready..."
            sleep 10
            until curl -s http://localhost:3000 >/dev/null 2>&1; do
                echo "Waiting for service..."
                sleep 2
            done
            echo "✅ Environment reset complete"
            get_memory_stats
            ;;
        8)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            ;;
    esac
done