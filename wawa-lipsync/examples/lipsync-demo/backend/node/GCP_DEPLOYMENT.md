# Aisha Backend - GCP Cloud Run Deployment Guide

This guide walks you through deploying the Aisha booster pack backend to Google Cloud Platform using Cloud Run.

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. **Docker** (optional, for local testing)

## Quick Deploy

### Option 1: Using the deployment script

```bash
cd backend/node
chmod +x deploy-gcp.sh
./deploy-gcp.sh YOUR_PROJECT_ID us-central1
```

### Option 2: Manual deployment

1. **Build and push the container:**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/aisha-backend
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy aisha-backend \
     --image gcr.io/YOUR_PROJECT_ID/aisha-backend \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --port 8080
   ```

## Environment Variables

After deployment, set your environment variables in Cloud Run:

```bash
gcloud run services update aisha-backend \
  --region us-central1 \
  --set-env-vars \
    GOOGLE_CLIENT_ID=your_client_id,\
    GOOGLE_CLIENT_SECRET=your_client_secret,\
    GOOGLE_REDIRECT_URI=https://your-cloud-run-url.run.app/oauth2callback,\
    GOOGLE_MAPS_API_KEY=your_maps_key,\
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**For sensitive secrets (refresh tokens, service account keys):**

Use Google Secret Manager instead of env vars:

1. **Create secrets:**
   ```bash
   echo -n "your_refresh_token" | gcloud secrets create google-refresh-token --data-file=-
   echo -n "your_service_account_json" | gcloud secrets create gcp-service-account --data-file=-
   ```

2. **Grant Cloud Run access:**
   ```bash
   gcloud secrets add-iam-policy-binding google-refresh-token \
     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Mount secrets in Cloud Run:**
   ```bash
   gcloud run services update aisha-backend \
     --region us-central1 \
     --update-secrets=/secrets/refresh-token=google-refresh-token:latest,\
       /secrets/service-account=gcp-service-account:latest
   ```

## OAuth Setup

1. **Update OAuth redirect URI** in Google Cloud Console:
   - Go to **APIs & Services** → **Credentials**
   - Edit your OAuth 2.0 Client ID
   - Add: `https://YOUR_SERVICE_URL.run.app/oauth2callback`

2. **Get auth URL:**
   ```bash
   curl https://YOUR_SERVICE_URL.run.app/aisha/auth-url
   ```

3. **Complete OAuth flow** and save tokens (Cloud Run will need these in Secret Manager)

## Service Account for Vision/Translation

If using Cloud Vision or Translation APIs:

1. **Create service account:**
   ```bash
   gcloud iam service-accounts create aisha-backend-sa \
     --display-name="Aisha Backend Service Account"
   ```

2. **Grant permissions:**
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:aisha-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/cloudtranslate.user"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:aisha-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/vision.user"
   ```

3. **Use Application Default Credentials** (Cloud Run automatically provides these)

## Update Frontend

Update your Netlify environment variable:

```
VITE_AISHA_BACKEND_URL=https://YOUR_SERVICE_URL.run.app
```

## Monitoring & Logs

- **View logs:**
  ```bash
  gcloud run services logs read aisha-backend --region us-central1
  ```

- **View in Console:**
  https://console.cloud.google.com/run

## Cost Optimization

Cloud Run charges per request and compute time. To minimize costs:

- Set **min instances: 0** (scales to zero when idle)
- Set **max instances: 1** (for low traffic)
- Use **CPU allocation: CPU only during request processing**

```bash
gcloud run services update aisha-backend \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 1 \
  --cpu-throttling
```

## Troubleshooting

**Service won't start:**
- Check logs: `gcloud run services logs read aisha-backend --region us-central1`
- Verify environment variables are set correctly
- Ensure PORT is set to 8080

**OAuth not working:**
- Verify redirect URI matches exactly in Google Cloud Console
- Check that tokens are stored in Secret Manager (if using)

**API calls failing:**
- Verify service account has correct IAM roles
- Check that APIs are enabled in your project

