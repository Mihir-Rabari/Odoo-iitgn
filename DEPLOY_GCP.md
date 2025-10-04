# Deploy Expe to GCP Cloud Run (Single Service)

This guide shows how to deploy the entire Expe stack as a **single Cloud Run service** using multi-container deployment with sidecars.

## Architecture

```
Cloud Run Service (expe-app)
├── Frontend Container (Nginx) - Port 8080
├── Backend Container (Node.js) - Port 3000
└── Cloud SQL Proxy Sidecar
    ↓
Cloud SQL (PostgreSQL)
Memorystore for Redis
Cloud Storage (for uploads)
```

## Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed locally
4. **Artifact Registry** enabled

## Step 1: Set Environment Variables

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="expe-app"
export REPO_NAME="expe-repo"
```

## Step 2: Enable Required APIs

```bash
gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com
```

## Step 3: Create Cloud SQL Instance (PostgreSQL)

```bash
gcloud sql instances create expe-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create expe_db --instance=expe-postgres

# Create user
gcloud sql users create expe_user \
  --instance=expe-postgres \
  --password=YOUR_SECURE_PASSWORD
```

Get the connection name:
```bash
gcloud sql instances describe expe-postgres --format='value(connectionName)'
# Save this as INSTANCE_CONNECTION_NAME
```

## Step 4: Create Memorystore for Redis

```bash
gcloud redis instances create expe-redis \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=basic

# Get Redis host and port
gcloud redis instances describe expe-redis --region=$REGION
# Save host and port (usually 6379)
```

## Step 5: Create Cloud Storage Bucket for Uploads

```bash
gsutil mb -l $REGION gs://${PROJECT_ID}-expe-uploads
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-expe-uploads
```

## Step 6: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Expe Docker images"

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

## Step 7: Build and Push Images

### Backend
```bash
cd backend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/backend:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/backend:latest
cd ..
```

### Frontend
```bash
cd frontend
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/frontend:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/frontend:latest
cd ..
```

## Step 8: Deploy to Cloud Run (Multi-Container)

Create `cloud-run-service.yaml`:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: expe-app
  annotations:
    run.googleapis.com/launch-stage: BETA
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/vpc-access-connector: projects/PROJECT_ID/locations/REGION/connectors/expe-connector
    spec:
      containers:
      # Frontend Container (Nginx)
      - name: frontend
        image: REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/frontend:latest
        ports:
        - containerPort: 80
          name: http1
        resources:
          limits:
            memory: 512Mi
            cpu: 1000m

      # Backend Container (Node.js)
      - name: backend
        image: REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          value: postgresql://expe_user:YOUR_PASSWORD@localhost:5432/expe_db
        - name: REDIS_URL
          value: redis://REDIS_HOST:6379
        - name: FRONTEND_URL
          value: https://expe-app-HASH-uc.a.run.app
        - name: JWT_SECRET
          value: YOUR_JWT_SECRET
        - name: GEMINI_API_KEY
          value: YOUR_GEMINI_KEY
        resources:
          limits:
            memory: 1Gi
            cpu: 2000m

      # Cloud SQL Proxy Sidecar
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest
        args:
        - "--port=5432"
        - "INSTANCE_CONNECTION_NAME"
        resources:
          limits:
            memory: 256Mi
            cpu: 500m
```

**Note**: Cloud Run multi-container is in **BETA** and requires gen2 execution environment.

## Step 9: Create VPC Connector (for Redis access)

```bash
gcloud compute networks vpc-access connectors create expe-connector \
  --region=$REGION \
  --range=10.8.0.0/28
```

## Step 10: Deploy Service

Replace placeholders in `cloud-run-service.yaml` and deploy:

```bash
gcloud run services replace cloud-run-service.yaml --region=$REGION
```

Or use `gcloud run deploy` (simpler for single container):

```bash
# For single-container approach, deploy backend only and use Cloud Storage for static frontend
gcloud run deploy expe-backend \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/backend:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=INSTANCE_CONNECTION_NAME \
  --vpc-connector=expe-connector \
  --set-env-vars="NODE_ENV=production,PORT=3000,DATABASE_URL=postgresql://expe_user:PASSWORD@localhost:5432/expe_db,REDIS_URL=redis://REDIS_HOST:6379,JWT_SECRET=YOUR_SECRET"
```

## Alternative: Single Container with Nginx + Node.js

For a truly single-container deployment, create a combined Dockerfile:

### Create `Dockerfile.combined` at repo root:

```dockerfile
FROM node:18-bullseye-slim AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src ./src

FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache nodejs npm curl libvips

# Copy backend
COPY --from=backend-build /app/backend /app/backend
WORKDIR /app/backend

# Copy frontend build to Nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Startup script
COPY <<'EOF' /start.sh
#!/bin/sh
node /app/backend/src/server.js &
nginx -g 'daemon off;'
EOF

RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
```

Build and deploy:
```bash
docker build -f Dockerfile.combined -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest

gcloud run deploy expe-app \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --add-cloudsql-instances=INSTANCE_CONNECTION_NAME \
  --vpc-connector=expe-connector \
  --set-env-vars="NODE_ENV=production,PORT=3000,DATABASE_URL=postgresql://expe_user:PASSWORD@/expe_db?host=/cloudsql/INSTANCE_CONNECTION_NAME,REDIS_URL=redis://REDIS_HOST:6379,JWT_SECRET=YOUR_SECRET,GEMINI_API_KEY=YOUR_KEY"
```

## Step 11: Run Database Migrations

Connect to Cloud SQL and run migrations:

```bash
gcloud sql connect expe-postgres --user=expe_user --database=expe_db

# Or via Cloud SQL Proxy locally
cloud-sql-proxy INSTANCE_CONNECTION_NAME &
cd backend
npm run migrate
```

## Step 12: Access Your App

Get the service URL:
```bash
gcloud run services describe expe-app --region=$REGION --format='value(status.url)'
```

Visit the URL to access your deployed app.

## Cost Optimization

- Use **db-f1-micro** for Cloud SQL (free tier eligible)
- Use **basic tier Redis** (1GB)
- Cloud Run charges only when serving requests
- Set min instances to 0 for cost savings

## Monitoring

- Cloud Run logs: `gcloud run services logs tail expe-app --region=$REGION`
- Cloud SQL logs: GCP Console → SQL → Logs
- Redis metrics: GCP Console → Memorystore

## CI/CD with Cloud Build

Create `cloudbuild.yaml`:

```yaml
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/backend:$SHORT_SHA', './backend']
  
  # Build frontend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/frontend:$SHORT_SHA', './frontend']
  
  # Build combined
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.combined', '-t', '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/expe-combined:$SHORT_SHA', '.']
  
  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/expe-combined:$SHORT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'expe-app'
      - '--image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/expe-combined:$SHORT_SHA'
      - '--region=${_REGION}'
      - '--platform=managed'

substitutions:
  _REGION: us-central1
  _REPO: expe-repo

images:
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO}/expe-combined:$SHORT_SHA'
```

Trigger build:
```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Summary

- **Single Cloud Run service** with combined Nginx + Node.js container
- **Cloud SQL** for Postgres (with Cloud SQL Proxy)
- **Memorystore** for Redis (via VPC connector)
- **Cloud Storage** for uploads (optional, or use volume mounts)
- **Artifact Registry** for Docker images
- **Cloud Build** for CI/CD

This approach keeps everything in one service, simplifying deployment and reducing costs.
