# Aisha Node Backend

This lightweight Express backend exposes Google service integrations for the Aisha avatar experience. Each Google API is wrapped in its own service class so the orchestrator can mix and match capabilities without touching existing frontend routes.

## Architecture at a Glance

- **Frontend stays untouched** – the Vite app (and existing Google Calendar OAuth flow) keeps working exactly as before.
- **Booster pack backend (`backend/node`)** – optional add-on that houses server-side credentials, token storage (`backend/node/tokens/aisha-tokens.json`), and the Express API.
- **Modular service wrappers** – located in `src/services/index.js`, each class encapsulates a single Google product (Gmail, Drive, Tasks, Contacts, YouTube, Maps, Vision, Translation, HomeGraph, optional Firebase).
- **`AishaOrchestrator`** – central hub that spins up only the services you have credentials for. It also exposes higher-level helpers like the morning briefing and image processing.
- **Express server (`src/server.js`)** – exposes REST endpoints, guards calls until the orchestrator has been initialized, and keeps this booster pack isolated from existing routes.

## Features

- OAuth 2.0 flow using `googleapis` with token persistence
- Modular service wrappers for Gmail, Drive, Tasks, Contacts, YouTube, Maps, Cloud Vision, Cloud Translation, and Google Home Graph
- Optional Firebase integration (disabled unless credentials are provided)
- REST endpoints for initialization, morning briefing, email search, Vision analysis, and a sample Smart Home webhook

## Getting Started

1. Install dependencies:

   ```bash
   cd wawa-lipsync/examples/lipsync-demo/backend/node
   npm install
   ```

2. Copy `env.example` to `.env` and fill in the required credentials.

3. Complete the OAuth consent flow once:

   - Start the server with `npm start`
   - Visit `/aisha/auth-url` to get the Google consent link (or check the console output)
   - Approve the requested scopes
   - Tokens are saved in `backend/node/tokens/aisha-tokens.json`

4. Initialize the orchestrator:

   ```bash
   curl -X POST http://localhost:3000/aisha/initialize
   ```

5. Explore the helper routes (see `src/server.js` for endpoints).
6. In the Vite frontend (`wawa-lipsync/examples/lipsync-demo`), set `VITE_AISHA_BACKEND_URL=http://localhost:3000` (or your deployed URL) so Ai'sha can reach these endpoints.

## Endpoint Map

| Route | Method | Purpose | Notes |
|-------|--------|---------|-------|
| `/health` | GET | Check server status and whether services are initialized | Useful for readiness probes |
| `/aisha/auth-url` | GET | Generate the Google OAuth consent link | Run once to seed tokens |
| `/oauth2callback` | GET | Handle OAuth redirect and persist tokens | Same client ID/secret as the frontend |
| `/aisha/initialize` | POST | Load saved tokens and instantiate service wrappers | Must be called before protected endpoints |
| `/aisha/briefing/:userId` | GET | Morning briefing (unread email count + tasks summary) | Persists to Firestore when Firebase creds exist |
| `/aisha/email/search` | POST | Gmail search across the connected inbox | Expects `{ "query": "from:..." }` |
| `/aisha/vision/analyze` | POST | Cloud Vision OCR/labels/faces with optional translation | Expects `{ "imagePath": "...", "translate": true }` |
| `/aisha/home/webhook` | POST | Sample Google Home intent handler | Extend as needed for smarthome flows |

## Hooking the Booster Pack into the Frontend

1. Run the booster backend (`npm start` in `backend/node`).
2. Complete OAuth once (`/aisha/auth-url` → sign in → redirects to `/oauth2callback`).
3. POST `/aisha/initialize` so the orchestrator loads tokens and spins up services.
4. Create new frontend utilities or hooks that fetch the REST endpoints above (e.g., request a morning briefing, Vision analysis, Maps search).
5. Deploy the backend separately (Render, Fly, Netlify Functions, etc.) if desired—the static frontend build remains unchanged.

## Deployment

### Google Cloud Platform (Cloud Run)

**Recommended for GCP users.** See [GCP_DEPLOYMENT.md](./GCP_DEPLOYMENT.md) for complete instructions.

Quick deploy:
```bash
cd backend/node
./deploy-gcp.sh YOUR_PROJECT_ID us-central1
```

The deployment includes:
- Dockerfile for containerization
- Cloud Build configuration
- Automatic scaling (scales to zero when idle)
- Secret Manager integration for sensitive credentials

### Other Platforms

- **Render**: Use the Dockerfile with Render's Docker deployment
- **Fly.io**: `fly launch` with the Dockerfile
- **Railway**: Connect GitHub repo, Railway auto-detects Node.js
- **Netlify Functions**: Requires refactoring to serverless functions (not recommended for this use case)

## Notes

- Node 18+ is required (native `fetch` support).
- Cloud client libraries expect the `GOOGLE_APPLICATION_CREDENTIALS` env variable when using service accounts.
- Firebase is optional; the service is skipped unless all Firebase env vars are present.
- Default port is 8080 (Cloud Run compatible); set `PORT` env var to override.


