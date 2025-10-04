# Expe - Deployment Guide

## Quick Deploy Options

### Option 1: Full Docker Deployment (Recommended for Production)

#### Prerequisites
- Docker & Docker Compose installed on server
- Domain name configured
- SSL certificate (Let's Encrypt recommended)

#### Steps

1. **Clone the repository on your server:**
```bash
git clone https://github.com/Mihir-Rabari/Odoo-iitgn.git
cd Odoo-iitgn
```

2. **Configure environment variables:**
```bash
cd backend
cp .env.example .env
# Edit .env with production values
```

Important production settings:
```env
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
DATABASE_URL=postgresql://expe_user:secure_password@postgres:5432/expe_db
SMTP_HOST=smtp.gmail.com
EMAIL_USER=your-production-email@domain.com
EMAIL_PASS=your-app-password
FRONTEND_URL=https://yourdomain.com
```

3. **Start all services:**
```bash
docker-compose up -d
```

4. **Run migrations:**
```bash
docker exec -it expe-backend npm run migrate
```

5. **Build frontend:**
```bash
cd frontend
npm install
npm run build
```

6. **Serve frontend with Nginx** (see nginx config below)

### Option 2: Separate Services Deployment

#### Backend Deployment (Railway / Heroku / DigitalOcean)

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
cd backend
railway up
```

**Heroku:**
```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
heroku create expe-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... set all other env vars

# Deploy
cd backend
git push heroku main
```

#### Frontend Deployment (Vercel / Netlify / Cloudflare Pages)

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

**Environment variable to set:**
```
VITE_API_URL=https://your-backend-url.com/api
```

#### Database Deployment

**Managed PostgreSQL Options:**
1. **Railway:** Automatic with deployment
2. **Supabase:** Free tier available
3. **DigitalOcean Managed Database:** $15/month
4. **AWS RDS:** Scalable, pay as you go

**Setup Example (Supabase):**
1. Create account at supabase.com
2. Create new project
3. Get connection string
4. Update DATABASE_URL in backend .env
5. Run migrations

### Nginx Configuration

Create `/etc/nginx/sites-available/expe`:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    root /var/www/expe/frontend/dist;
    index index.html;
    
    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://localhost:3000;
    }
}

# SSL Configuration (after obtaining certificate)
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # ... rest of configuration same as above
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/expe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Staging
```env
NODE_ENV=staging
PORT=3000
FRONTEND_URL=https://staging.yourdomain.com
```

### Production
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

## Security Checklist

- [ ] Strong JWT_SECRET (min 32 characters)
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] File upload size limits set
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (helmet.js)
- [ ] Password policies enforced
- [ ] Email service secured (app passwords)

## Monitoring Setup

### Grafana Cloud (Free Tier)

1. Sign up at grafana.com
2. Get Prometheus remote write endpoint
3. Update prometheus.yml:

```yaml
remote_write:
  - url: https://prometheus-xxx.grafana.net/api/prom/push
    basic_auth:
      username: your-instance-id
      password: your-api-key
```

### Sentry Error Tracking

```bash
npm install @sentry/node
```

In backend/src/server.js:
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV
});
```

## Backup Strategy

### Database Backups

**Automated daily backups:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker exec expe-postgres pg_dump -U expe_user expe_db > backup_$DATE.sql
# Upload to S3 or similar
```

**Add to crontab:**
```bash
0 2 * * * /path/to/backup.sh
```

### File Backups

Backup uploads directory regularly:
```bash
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## Performance Optimization

### Frontend
- Enable production build minification
- Configure CDN for static assets
- Enable Gzip compression in Nginx
- Implement lazy loading for routes

### Backend
- Enable Redis caching
- Database query optimization
- Connection pooling
- Implement CDN for uploaded files

### Database
- Add appropriate indexes
- Regular VACUUM operations
- Connection pooling
- Read replicas for scaling

## Scaling Strategies

### Horizontal Scaling

**Multiple Backend Instances:**
```yaml
# docker-compose.yml
backend:
  deploy:
    replicas: 3
```

**Load Balancer (Nginx):**
```nginx
upstream backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```

### Vertical Scaling
- Increase container resources
- Upgrade server specifications
- Optimize database performance

## Troubleshooting

### Common Issues

**Backend not connecting to database:**
```bash
# Check database is running
docker ps
# Check logs
docker logs expe-postgres
# Verify connection string
```

**Frontend API calls failing:**
- Check CORS settings
- Verify VITE_API_URL
- Check network connectivity
- Review browser console

**Email not sending:**
- Verify SMTP credentials
- Check firewall rules
- Review email service logs

## Monitoring Checklist

- [ ] Server health monitoring
- [ ] Database performance
- [ ] API response times
- [ ] Error rates
- [ ] Disk space usage
- [ ] Memory usage
- [ ] CPU utilization
- [ ] User activity metrics

## Post-Deployment

1. **Test all features:**
   - Sign up flow
   - Login
   - Expense creation
   - Approval workflow
   - Email notifications

2. **Monitor for 24 hours:**
   - Check error logs
   - Monitor resource usage
   - Review performance metrics

3. **Setup alerts:**
   - High error rates
   - Service downtime
   - Database issues
   - Disk space warnings

## Rollback Plan

1. Keep previous version tagged in Git
2. Maintain database backups
3. Document rollback procedure:

```bash
# Rollback backend
git checkout previous-tag
docker-compose up -d --build

# Restore database if needed
docker exec -i expe-postgres psql -U expe_user expe_db < backup.sql
```

## Support

For deployment issues:
- Check logs: `docker-compose logs`
- Review monitoring dashboards
- Consult SETUP_GUIDE.md
- Check GitHub issues

## License

MIT
