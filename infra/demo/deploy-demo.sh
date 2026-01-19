#!/bin/bash
# Deploy Reviso API - Demo Environment

set -e

echo "=== Reviso API - Demo Deploy ==="

# 1. Check .env.demo exists
if [ ! -f .env.demo ]; then
    echo "ERROR: .env.demo not found"
    echo "Copy .env.demo.example to .env.demo and configure"
    exit 1
fi

# 2. Load environment
export $(cat .env.demo | grep -v '^#' | xargs)

# 3. Pull latest code
echo "Pulling latest code..."
git pull origin main

# 4. Stop containers
echo "Stopping containers..."
docker compose -f docker-compose.demo.yml down

# 5. Start containers
echo "Starting containers..."
docker compose -f docker-compose.demo.yml up -d --build

# 6. Wait for backend
echo "Waiting for backend to start..."
sleep 30

# 7. Check health
echo "Checking health..."
curl -f http://127.0.0.1:8080/actuator/health || {
    echo "ERROR: Backend health check failed"
    docker compose -f docker-compose.demo.yml logs backend
    exit 1
}

echo ""
echo "=== Deploy Complete ==="
echo "API running at: http://127.0.0.1:8080"
echo "Public URL: https://api.seudominio.com"
echo ""
echo "Check logs:"
echo "  docker compose -f docker-compose.demo.yml logs -f backend"
