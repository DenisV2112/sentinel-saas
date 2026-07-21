#!/bin/bash
# =============================================================================
# Sentinel SaaS — Oracle Cloud VM Setup (ARM64 Ampere A1)
# =============================================================================
# Run ONCE on a fresh Oracle Cloud VM (Ubuntu 22.04 ARM64).
# This installs Docker, clones the repo, and prepares the environment.
#
# Usage: bash scripts/setup-oracle-vm.sh
# =============================================================================
set -e

echo "============================================"
echo " Sentinel SaaS — Oracle VM Setup"
echo "============================================"

# --- Docker + Docker Compose ---
echo ""
echo "🐳 Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | bash
  sudo usermod -aG docker $USER
  echo "✅ Docker installed (log out/in to use without sudo)"
else
  echo "✅ Docker already installed: $(docker --version)"
fi

if ! docker compose version &>/dev/null 2>&1; then
  echo "📦 Installing Docker Compose plugin..."
  sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin
fi
echo "✅ Docker Compose: $(docker compose version)"

# --- Git clone ---
REPO_URL="https://github.com/DenisV2112/sentinel-saas.git"
DEPLOY_PATH="$HOME/sentinel-deployment"

echo ""
echo "📥 Cloning repository..."
if [ -d "$DEPLOY_PATH" ]; then
  echo "   Directory exists — pulling latest..."
  cd "$DEPLOY_PATH"
  git fetch origin main
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$DEPLOY_PATH"
  cd "$DEPLOY_PATH"
fi
echo "✅ Repository ready at $DEPLOY_PATH"

# --- .env.production ---
echo ""
if [ ! -f .env.production ]; then
  echo "⚠️  .env.production not found!"
  echo "   Creating from template — YOU MUST EDIT WITH REAL VALUES:"
  cp .env.production.example .env.production
  echo ""
  echo "   🔐 Edit .env.production now:"
  echo "      nano $DEPLOY_PATH/.env.production"
  echo ""
  echo "   Required: DB_PASSWORD, MONGO_PASSWORD, RABBITMQ_PASSWORD,"
  echo "             KONG_DB_PASSWORD, JWT_SECRET, MERCADOPAGO_ACCESS_TOKEN,"
  echo "             MERCADOPAGO_PUBLIC_KEY, MAIL_PASSWORD, GOOGLE_CLIENT_SECRET"
  echo ""
  echo "   Generate secure passwords:"
  echo "      openssl rand -hex 32  # for DB, Mongo, RabbitMQ"
  echo "      openssl rand -hex 64  # for JWT_SECRET"
else
  echo "✅ .env.production already exists"
fi

# --- Firewall reminder ---
echo ""
echo "============================================"
echo " ✅ VM SETUP COMPLETE"
echo ""
echo " Next steps:"
echo "   1. Edit .env.production with real secrets"
echo "   2. Open Oracle VCN ports: 80, 443, 8000"
echo "      OCI Console → Networking → Virtual Cloud Networks → Security Lists"
echo "   3. Run first deploy:"
echo "      cd $DEPLOY_PATH && bash scripts/first-deploy.sh"
echo "============================================"
