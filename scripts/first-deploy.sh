#!/bin/bash
# =============================================================================
# Sentinel SaaS — First Deploy to Oracle Cloud Free Tier (ARM64 Ampere A1)
# =============================================================================
# Run ONCE on the Oracle VM after cloning the repo and creating .env.production.
# Prerequisites:
#   1. Docker + Docker Compose installed on VM
#   2. .env.production created with all required vars
#   3. Git repo cloned to $DEPLOY_PATH
#
# Usage: bash scripts/first-deploy.sh
# =============================================================================
set -e

echo "============================================"
echo " Sentinel SaaS — First Deploy to Oracle Cloud"
echo "============================================"
echo ""

# Check .env.production exists
if [ ! -f .env.production ]; then
  echo "❌ .env.production not found!"
  echo "   Copy .env.production.example → .env.production and set real values."
  exit 1
fi

echo "✅ .env.production found"

# Build and start all services (ddl-auto=update creates tables)
echo ""
echo "🔨 Building Docker images (ARM64 native — this takes 10-20 min)..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo ""
echo "🚀 Starting all services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo "⏳ Waiting for PostgreSQL to be healthy..."
until docker exec sentinel-postgres pg_isready -U sentinel 2>/dev/null; do
  echo "   Waiting..."
  sleep 5
done
echo "✅ PostgreSQL is ready"

echo ""
echo "⏳ Waiting for billing-service to start..."
# Give it time to create tables via ddl-auto=update
sleep 60

echo ""
echo "🌱 Seeding initial data (billing plans)..."
# Run data.sql to insert FREE, PRO, ENTERPRISE plans
docker exec -i sentinel-postgres psql -U sentinel -d sentinel_db <<'SQL'
-- Insert plans (only if they don't exist yet)
INSERT INTO plan (
  id, name, description, monthly_price_usd, monthly_price_cop,
  max_users, max_projects, max_domains, max_repos, max_tenants,
  includes_blockchain, recommended, created_at, updated_at
) VALUES
('FREE', 'Free', 'Plan gratuito para explorar la plataforma. 1 usuario, 1 proyecto.',
 0.00, 0, 1, 1, 1, 1, 1, false, false, NOW(), NOW()),
('PRO', 'Pro', 'Ideal para equipos pequeños y medianos. Incluye 3 tenants y 6 proyectos.',
 29.99, 120000, 10, 6, 3, 10, 3, true, true, NOW(), NOW()),
('ENTERPRISE', 'Enterprise', 'Solución empresarial completa con soporte prioritario.',
 99.99, 400000, 25, 12, 10, 30, 6, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
SQL

echo "✅ Plans seeded"

echo ""
echo "📊 Service status:"
docker ps --filter "name=sentinel" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "============================================"
echo " ✅ FIRST DEPLOY COMPLETE!"
echo ""
echo " Next steps:"
echo "   1. Open firewall ports: 80, 443, 8000 on Oracle VCN"
echo "   2. Point DNS sentinel.crudzaso.com → VM public IP"
echo "   3. Set up NGINX reverse proxy + Let's Encrypt SSL"
echo "   4. After verifying all services, change ddl-auto to 'validate'"
echo "      in docker-compose.prod.yml for all Java services"
echo "   5. Visit: https://sentinel.crudzaso.com"
echo "============================================"
