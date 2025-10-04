#!/bin/bash
# Automated setup script for GCP VM deployment

set -e

echo "🚀 Expe VM Setup Script"
echo "======================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get VM external IP
echo "📡 Getting VM external IP..."
VM_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google" 2>/dev/null || echo "localhost")

if [ "$VM_IP" == "localhost" ]; then
    echo -e "${YELLOW}⚠️  Could not detect VM IP. Using localhost.${NC}"
    echo "Please update FRONTEND_URL in .env manually after setup."
else
    echo -e "${GREEN}✓ VM IP: $VM_IP${NC}"
fi

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists. Backing up to .env.backup${NC}"
    cp .env .env.backup
fi

# Generate random secrets
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)

echo ""
echo "🔐 Generating secure credentials..."

# Create .env file
cat > .env << EOF
# Node Environment
NODE_ENV=production

# Database
POSTGRES_USER=expe_user
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=expe_db
DATABASE_URL=postgresql://expe_user:$DB_PASSWORD@postgres:5432/expe_db

# Redis
REDIS_URL=redis://redis:6379

# Backend
PORT=3000
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://$VM_IP:8080

# API Keys (optional - add your keys here)
GEMINI_API_KEY=
EXCHANGE_RATE_API_KEY=

# Email (optional - configure for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@expe.com

# File Upload
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo -e "${GREEN}✓ Created .env file${NC}"

# Copy to backend
cp .env backend/.env
echo -e "${GREEN}✓ Copied .env to backend/${NC}"

echo ""
echo "🐳 Starting Docker Compose stack..."
echo ""

# Stop any existing containers
docker-compose down 2>/dev/null || true

# Build and start services
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo ""
echo "🔄 Running database migrations..."
if docker-compose exec -T backend npm run migrate; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}✗ Migration failed. Check logs with: docker-compose logs backend${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Credentials saved in .env file"
echo "   Database Password: $DB_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo ""
echo "🌐 Access your application:"
echo "   Frontend:    http://$VM_IP:8080"
echo "   Backend API: http://$VM_IP:3000/api"
echo "   Health:      http://$VM_IP:3000/health"
echo "   Prometheus:  http://$VM_IP:9090"
echo "   Grafana:     http://$VM_IP:3001 (admin/admin)"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Restart:          docker-compose restart"
echo "   Stop:             docker-compose down"
echo "   Update app:       git pull && docker-compose up -d --build"
echo ""
echo "🔒 Security recommendations:"
echo "   1. Change Grafana password (admin/admin)"
echo "   2. Setup SSL with Caddy or Let's Encrypt"
echo "   3. Configure firewall rules"
echo "   4. Add your API keys to .env"
echo "   5. Configure email service"
echo ""
echo "═══════════════════════════════════════════════════════════"
