#!/bin/bash
# Quick deployment script for GCP Cloud Run

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="expe-app"
REPO_NAME="expe-repo"

echo "🚀 Deploying Expe to GCP Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Set project
gcloud config set project $PROJECT_ID

# Build and push using Cloud Build
echo "📦 Building and pushing image..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_REPO=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME

echo "✅ Deployment complete!"
echo "🌐 Service URL:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'
