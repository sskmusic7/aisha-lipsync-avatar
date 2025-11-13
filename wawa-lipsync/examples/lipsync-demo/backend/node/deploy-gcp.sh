#!/bin/bash

# Aisha Backend - GCP Cloud Run Deployment Script
# Usage: ./deploy-gcp.sh [PROJECT_ID] [REGION]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}
REGION=${2:-us-central1}
SERVICE_NAME="aisha-backend"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: PROJECT_ID required"
  echo "Usage: ./deploy-gcp.sh [PROJECT_ID] [REGION]"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

echo "🚀 Deploying Aisha Backend to GCP Cloud Run"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling required GCP APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com

# Build and deploy using Cloud Build
echo "🔨 Building and deploying with Cloud Build..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "   Service URL: $SERVICE_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Set environment variables in Cloud Run:"
echo "      gcloud run services update $SERVICE_NAME --region=$REGION --set-env-vars KEY=VALUE"
echo ""
echo "   2. Update your frontend VITE_AISHA_BACKEND_URL to: $SERVICE_URL"
echo ""

