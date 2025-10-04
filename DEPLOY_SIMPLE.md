# Simple VM Deployment with PM2

Deploy Expe on a VM using Docker for databases and PM2 for Node.js apps.

## Architecture

```
VM
├── Docker Compose
│   ├── PostgreSQL (port 5432)
│   └── Redis (port 6379)
└── PM2
    ├── Backend (Node.js on port 3000)
    └── Frontend (Vite preview on port 5173)
```

## Prerequisites

- Ubuntu/Debian VM
- Docker and Docker Compose installed
- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`

## Step 1: Clone Repository

```bash
cd ~
git clone https://github.com/Mihir-Rabari/Odoo-iitgn.git
cd Odoo-iitgn
```

## Step 2: Start Databases (Docker)

```bash
# Start Postgres and Redis
docker compose up -d

# Verify they're running
docker compose ps
```

## Step 3: Configure Environment

```bash
# Create .env from example
cp .env.example .env

# Edit .env and update:
# - FRONTEND_URL=http://YOUR_VM_IP:5173
# - JWT_SECRET=<generate a random string>
nano .env
```

Also create backend/.env:
```bash
cp .env backend/.env
```

And frontend/.env:
```bash
echo "VITE_API_URL=http://YOUR_VM_IP:3000/api" > frontend/.env
```

## Step 4: Install Dependencies

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..
```

## Step 5: Run Database Migrations

```bash
cd backend
npm run migrate
cd ..
```

## Step 6: Create Uploads Directory

```bash
mkdir -p backend/uploads
```

## Step 7: Create Logs Directory

```bash
mkdir -p logs
```

## Step 8: Start with PM2

```bash
# Start both apps
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

## Step 9: Access Application

- **Frontend**: http://YOUR_VM_IP:5173
- **Backend API**: http://YOUR_VM_IP:3000/api
- **Health Check**: http://YOUR_VM_IP:3000/health

## PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs
pm2 logs expe-backend
pm2 logs expe-frontend

# Restart
pm2 restart all
pm2 restart expe-backend
pm2 restart expe-frontend

# Stop
pm2 stop all

# Delete
pm2 delete all

# Save PM2 process list (auto-restart on reboot)
pm2 save
pm2 startup
```

## Update Application

```bash
# Pull latest code
git pull

# Rebuild frontend
cd frontend
npm install
npm run build
cd ..

# Restart PM2
pm2 restart all
```

## Firewall Configuration

Allow ports:
```bash
sudo ufw allow 5173/tcp  # Frontend
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 5432/tcp  # Postgres (if external access needed)
sudo ufw allow 6379/tcp  # Redis (if external access needed)
```

## Database Backup

```bash
# Backup
docker exec expe-postgres pg_dump -U expe_user expe_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20250104.sql | docker exec -i expe-postgres psql -U expe_user -d expe_db
```

## Troubleshooting

### Check if databases are running:
```bash
docker compose ps
```

### Check PM2 processes:
```bash
pm2 status
pm2 logs
```

### Test database connection:
```bash
docker exec -it expe-postgres psql -U expe_user -d expe_db
```

### Test Redis connection:
```bash
docker exec -it expe-redis redis-cli ping
```

### Backend not connecting to DB:
- Ensure DATABASE_URL in .env uses `localhost:5432` (not `postgres:5432`)
- Check Docker containers are running: `docker compose ps`

### Frontend can't reach backend:
- Ensure VITE_API_URL in frontend/.env points to VM IP
- Check backend is running: `pm2 status`
- Test: `curl http://localhost:3000/health`

## Production Checklist

- [ ] Change default database password in docker-compose.yml
- [ ] Set strong JWT_SECRET in .env
- [ ] Configure SSL/HTTPS (use Caddy or Nginx reverse proxy)
- [ ] Setup automated backups
- [ ] Configure email service
- [ ] Setup PM2 startup script: `pm2 startup && pm2 save`
- [ ] Configure firewall rules
- [ ] Setup monitoring/alerts

## Cost Estimate

- **VM (e2-medium)**: ~$25/month
- **Disk (30GB)**: ~$2/month
- **Total**: ~$27/month

Use e2-micro for free tier (1 vCPU, 1GB RAM).
