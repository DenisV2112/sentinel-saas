#!/bin/bash
# Sentinel Local Development Startup Script
# Run this script in your local machine

set -e

echo "==================================="
echo "Sentinel Local Development Setup"
echo "==================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

echo "Starting Sentinel services locally..."
echo ""

# Check if using docker-compose or docker compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Build and start all services
$COMPOSE_CMD -f docker-compose.local.yml --env-file .env.local up -d --build

echo ""
echo "==================================="
echo "Services started!"
echo "==================================="
echo ""
echo "Access points:"
echo "- Frontend:      http://localhost:3000"
echo "- API Gateway:   http://localhost:8000"
echo "- Kong Admin:    http://localhost:8001"
echo "- Auth Service:   http://localhost:8081"
echo "- Tenant Svc:    http://localhost:8082"
echo "- Project Svc:   http://localhost:8083"
echo "- Billing Svc:  http://localhost:8084"
echo "- BFF Svc:     http://localhost:8080"
echo "- Results:      http://localhost:8087"
echo "- Orchestrator: http://localhost:8086"
echo "- RabbitMQ:     http://localhost:15672"
echo "- n8n:         http://localhost:5678"
echo ""
echo "View logs:"
echo "  $COMPOSE_CMD -f docker-compose.local.yml logs -f"
echo ""
echo "Stop services:"
echo "  $COMPOSE_CMD -f docker-compose.local.yml down"