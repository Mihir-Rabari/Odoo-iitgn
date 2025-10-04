#!/bin/bash
# Simple deployment script for GCP Cloud Run with external databases

set -e

# Configuration - UPDATE THESE
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="expe-app"
REPO_NAME="expe-repo"

echo "🚀 Deploying Expe to GCP Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Check if secrets exist, if not prompt to create them
echo "📝 Checking secrets..."
if ! gcloud secrets describe database-url --project=$PROJECT_ID &>/dev/null; then
  echo "⚠️  Secret 'database-url' not found."
  echo "Please create secrets first:"
  echo ""
  echo "  echo -n 'postgresql://user:pass@host:5432/db' | gcloud secrets create database-url --data-file=-"
  echo "  echo -n 'redis://host:6379' | gcloud secrets create redis-url --data-file=-"
  echo "  echo -n 'your-jwt-secret' | gcloud secrets create jwt-secret --data-file=-"
  echo "  echo -n 'your-gemini-key' | gcloud secrets create gemini-api-key --data-file=-"
  echo ""
  read -p "Have you created the secrets? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Set project
gcloud config set project $PROJECT_ID

# Build and push using Cloud Build
echo "📦 Building image with Cloud Build..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPO=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME

# Deploy with secrets
echo "🚀 Deploying to Cloud Run..."
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

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

# Update FRONTEND_URL
echo "🔧 Updating FRONTEND_URL..."
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --update-env-vars="FRONTEND_URL=${SERVICE_URL}"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Run database migrations: cd backend && npm run migrate"
echo "2. Visit $SERVICE_URL to access your app"
echo "3. Check logs: gcloud run services logs tail $SERVICE_NAME --region=$REGION"
