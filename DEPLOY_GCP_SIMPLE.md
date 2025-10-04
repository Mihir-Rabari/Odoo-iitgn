# Deploy Expe to GCP Cloud Run (Simplified - External DB)

Since you already have Postgres and Redis running externally, you only need to deploy the application container to Cloud Run.

## Prerequisites

- GCP Project with billing enabled
- `gcloud` CLI installed and authenticated
- External Postgres database (connection string ready)
- External Redis instance (connection string ready)

## Step 1: Set Environment Variables

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="expe-app"
export REPO_NAME="expe-repo"

# Your external database credentials
export DATABASE_URL="postgresql://user:password@your-postgres-host:5432/expe_db"
export REDIS_URL="redis://your-redis-host:6379"
export JWT_SECRET="your-super-secret-jwt-key"
export GEMINI_API_KEY="your-gemini-api-key"  # optional
```

## Step 2: Enable Required APIs

```bash
gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

## Step 3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create $REPO_NAME \
  --repository-format=docker \
  --location=$REGION \
  --description="Expe Docker images"

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

## Step 4: Deploy Using Cloud Build (Recommended)

Update `cloudbuild.yaml` to include your environment variables, then:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

After build completes, update the service with environment variables:

```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --set-env-vars="NODE_ENV=production,PORT=3000,DATABASE_URL=${DATABASE_URL},REDIS_URL=${REDIS_URL},JWT_SECRET=${JWT_SECRET},GEMINI_API_KEY=${GEMINI_API_KEY},FRONTEND_URL=https://${SERVICE_NAME}-HASH.a.run.app"
```

## Step 5: One-Command Deploy (Alternative)

Build locally and deploy directly:

```bash
# Build the combined image
docker build -f Dockerfile.combined \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest .

# Push to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest

# Deploy to Cloud Run with environment variables
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,PORT=3000,DATABASE_URL=${DATABASE_URL},REDIS_URL=${REDIS_URL},JWT_SECRET=${JWT_SECRET},GEMINI_API_KEY=${GEMINI_API_KEY}"
```

## Step 6: Get Service URL

```bash
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)'
```

Save this URL and update the `FRONTEND_URL` environment variable:

```bash
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="FRONTEND_URL=${SERVICE_URL}"
```

## Step 7: Run Database Migrations

Connect to your external Postgres and run migrations:

```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://user:password@your-postgres-host:5432/expe_db"

cd backend
npm install
npm run migrate
```

## Using Secret Manager (Recommended for Production)

Instead of passing secrets as environment variables, use Secret Manager:

### Create secrets:
```bash
echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "$REDIS_URL" | gcloud secrets create redis-url --data-file=-
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
```

### Grant Cloud Run access:
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding redis-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy with secrets:
```bash
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --memory=2Gi \
  --cpu=2 \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars="NODE_ENV=production,PORT=3000"
```

## Quick Deploy Script

Create `deploy-simple.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID="your-project-id"
REGION="us-central1"
SERVICE_NAME="expe-app"
REPO_NAME="expe-repo"

echo "🚀 Building and deploying Expe..."

# Build and push
docker build -f Dockerfile.combined \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest

# Deploy (using Secret Manager)
gcloud run deploy $SERVICE_NAME \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/expe-combined:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=0 \
  --max-instances=10 \
  --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars="NODE_ENV=production,PORT=3000"

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
```

## Verify Deployment

1. **Check service health:**
   ```bash
   curl https://your-service-url.a.run.app/health
   ```

2. **Check logs:**
   ```bash
   gcloud run services logs tail $SERVICE_NAME --region=$REGION
   ```

3. **Test the app:**
   - Open the service URL in your browser
   - Sign up for a new account
   - Create an expense

## Troubleshooting

### Database connection issues:
- Ensure your Postgres allows connections from Cloud Run IPs
- Check if DATABASE_URL is correct
- Verify firewall rules

### Redis connection issues:
- Ensure Redis allows external connections
- Check REDIS_URL format: `redis://host:port` or `redis://user:password@host:port`
- Verify authentication if required

### Container startup issues:
```bash
# Check logs
gcloud run services logs tail $SERVICE_NAME --region=$REGION --limit=100

# Check environment variables
gcloud run services describe $SERVICE_NAME --region=$REGION
```

## Cost

With external databases, Cloud Run costs are minimal:
- **Cloud Run**: ~$0 for low traffic (free tier: 2M requests/month)
- **Artifact Registry**: ~$0.10/GB/month for storage
- **Total**: < $5/month for small workloads

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'
    
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    
    - name: 'Build and Deploy'
      run: |
        gcloud builds submit --config=cloudbuild.yaml
        
        gcloud run services update expe-app \
          --region=us-central1 \
          --set-secrets="DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,JWT_SECRET=jwt-secret:latest"
```

## Summary

Since you have external Postgres and Redis:
1. ✅ No need for Cloud SQL or Memorystore
2. ✅ No VPC connector required
3. ✅ Just deploy the container with connection strings
4. ✅ Use Secret Manager for credentials
5. ✅ Deploy in < 5 minutes

**Next Step**: Run the one-command deploy above with your database credentials!
