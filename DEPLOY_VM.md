# Deploy Expe on GCP VM (Complete Stack)

This guide shows how to deploy the entire Expe stack on a single GCP VM using Docker Compose.

## Architecture

```
GCP VM Instance
├── Docker Compose Stack
│   ├── Frontend (Nginx) - Port 8080
│   ├── Backend (Node.js) - Port 3000
│   ├── PostgreSQL - Port 5432
│   ├── Redis - Port 6379
│   ├── Postgres Exporter - Port 9187
│   ├── Redis Exporter - Port 9121
│   ├── Prometheus - Port 9090
│   └── Grafana - Port 3001
└── Uploads stored in /app/uploads (mounted volume)
```

## Step 1: Create GCP VM Instance

### Using gcloud CLI:

```bash
export PROJECT_ID="your-gcp-project-id"
export ZONE="us-central1-a"
export VM_NAME="expe-vm"

gcloud compute instances create $VM_NAME \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=e2-medium \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-balanced \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose git
    systemctl enable docker
    systemctl start docker
    usermod -aG docker $USER
  '
```

### Or via GCP Console:

1. Go to **Compute Engine** → **VM Instances** → **Create Instance**
2. **Name**: expe-vm
3. **Region**: us-central1
4. **Machine type**: e2-medium (2 vCPU, 4 GB memory)
5. **Boot disk**: Ubuntu 22.04 LTS, 30 GB
6. **Firewall**: Allow HTTP and HTTPS traffic
7. Click **Create**

## Step 2: Configure Firewall Rules

```bash
# Allow application ports
gcloud compute firewall-rules create expe-allow-app \
  --project=$PROJECT_ID \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:8080,tcp:3000,tcp:9090,tcp:3001 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

## Step 3: SSH into VM and Setup

```bash
gcloud compute ssh $VM_NAME --zone=$ZONE
```

Once inside the VM:

```bash
# Install Docker and Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git curl

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again for group changes
exit
```

SSH back in:
```bash
gcloud compute ssh $VM_NAME --zone=$ZONE
```

## Step 4: Clone Repository

```bash
cd ~
git clone https://github.com/Mihir-Rabari/Odoo-iitgn.git
cd Odoo-iitgn
```

## Step 5: Configure Environment Variables

Create `.env` file in the project root:

```bash
cat > .env << 'EOF'
# Node Environment
NODE_ENV=production

# Database
POSTGRES_USER=expe_user
POSTGRES_PASSWORD=change_this_secure_password
POSTGRES_DB=expe_db
DATABASE_URL=postgresql://expe_user:change_this_secure_password@postgres:5432/expe_db

# Redis
REDIS_URL=redis://redis:6379

# Backend
PORT=3000
JWT_SECRET=change_this_to_a_very_long_random_string
JWT_EXPIRES_IN=7d

# Frontend URL (will update after getting VM external IP)
FRONTEND_URL=http://YOUR_VM_EXTERNAL_IP:8080

# API Keys (optional)
GEMINI_API_KEY=your_gemini_api_key_here
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key_here

# Email (optional - configure for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@expe.com

# File Upload
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

Get your VM's external IP:
```bash
curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google"
```

Update `FRONTEND_URL` in `.env` with your VM's external IP.

## Step 6: Update Backend to Use .env

The backend already reads from environment variables. Ensure `backend/.env` is created:

```bash
cp .env backend/.env
```

## Step 7: Start the Stack

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 8: Run Database Migrations

```bash
# Wait for postgres to be ready (about 10 seconds)
sleep 10

# Run migrations
docker-compose exec backend npm run migrate

# Or run from host
docker exec -it expe-backend npm run migrate
```

## Step 9: Access Your Application

Get your VM's external IP:
```bash
VM_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google")
echo "Access your app at: http://${VM_IP}:8080"
```

### Service URLs:
- **Frontend**: http://YOUR_VM_IP:8080
- **Backend API**: http://YOUR_VM_IP:3000/api
- **Prometheus**: http://YOUR_VM_IP:9090
- **Grafana**: http://YOUR_VM_IP:3001 (admin/admin)
- **Health Check**: http://YOUR_VM_IP:3000/health

## Step 10: Setup SSL (Optional but Recommended)

### Using Caddy (Automatic HTTPS):

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Configure Caddy
sudo nano /etc/caddy/Caddyfile
```

Add this configuration:
```
your-domain.com {
    reverse_proxy localhost:8080
}
```

```bash
# Restart Caddy
sudo systemctl restart caddy
```

## Automated Setup Script

I've created `setup-vm.sh` that automates all the above steps. Just run:

```bash
chmod +x setup-vm.sh
./setup-vm.sh
```

## Useful Commands

### View logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart services:
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Stop all services:
```bash
docker-compose down
```

### Stop and remove all data:
```bash
docker-compose down -v
```

### Update application:
```bash
git pull
docker-compose up -d --build
```

### Backup database:
```bash
docker exec expe-postgres pg_dump -U expe_user expe_db > backup_$(date +%Y%m%d).sql
```

### Restore database:
```bash
cat backup_20250104.sql | docker exec -i expe-postgres psql -U expe_user -d expe_db
```

## Monitoring

- **Prometheus**: http://YOUR_VM_IP:9090
  - Check targets: Status → Targets
  - All should be "UP"

- **Grafana**: http://YOUR_VM_IP:3001
  - Login: admin/admin
  - Datasource already configured (Prometheus)
  - Import dashboards for Node.js, Postgres, Redis

## Troubleshooting

### Check if services are running:
```bash
docker-compose ps
```

### Check backend logs:
```bash
docker-compose logs backend
```

### Check if ports are open:
```bash
sudo netstat -tlnp | grep -E '8080|3000|5432|6379'
```

### Restart everything:
```bash
docker-compose down
docker-compose up -d --build
```

### Check disk space:
```bash
df -h
docker system df
```

### Clean up Docker:
```bash
docker system prune -a
```

## Cost Estimate

- **e2-medium VM**: ~$25/month (730 hours)
- **30GB disk**: ~$2/month
- **Egress**: ~$0.12/GB
- **Total**: ~$27-30/month

### Cost Optimization:
- Use **e2-micro** (free tier eligible): 1 vCPU, 1GB RAM
- Use **preemptible instances**: 60-91% cheaper
- Stop VM when not in use

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Setup firewall rules** to restrict access
3. **Enable SSL** with Caddy or Let's Encrypt
4. **Regular backups** of database
5. **Update packages** regularly:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
6. **Use Secret Manager** for sensitive data
7. **Setup monitoring alerts** in Grafana

## Production Checklist

- [ ] Changed all default passwords
- [ ] Configured SSL/HTTPS
- [ ] Setup automated backups
- [ ] Configured email service
- [ ] Setup monitoring alerts
- [ ] Configured firewall rules
- [ ] Setup log rotation
- [ ] Documented access credentials
- [ ] Setup CI/CD pipeline
- [ ] Load testing completed

## Next Steps

1. Point your domain to the VM's external IP
2. Setup SSL with Caddy
3. Configure email service for notifications
4. Setup automated backups
5. Configure Grafana dashboards
6. Setup alerting rules

Your Expe application is now running on GCP VM with full monitoring stack!
