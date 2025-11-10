"use strict";

const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { AishaAuthService } = require("./services");
const { AishaOrchestrator } = require("./orchestrator");

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: true }));

const orchestrator = new AishaOrchestrator();

function ensureInitialized(req, res, next) {
  if (!orchestrator.authService) {
    return res.status(503).json({
      error:
        "Aisha services not initialized. POST /aisha/initialize after completing OAuth.",
    });
  }
  next();
}

function handleServiceError(res, error) {
  if (error.code === "SERVICE_NOT_CONFIGURED") {
    return res.status(503).json({ error: error.message });
  }
  if (error.message?.includes("invalid_grant")) {
    return res.status(401).json({
      error:
        "Google tokens are invalid or expired. Re-authenticate via /aisha/auth-url.",
    });
  }
  return res.status(500).json({ error: error.message });
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Aisha backend is running",
    initialized: Boolean(orchestrator.authService),
  });
});

app.get("/aisha/auth-url", (req, res) => {
  try {
    const authService = new AishaAuthService();
    res.json({ url: authService.getAuthUrl() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No authorization code provided.");
  }

  try {
    const authService = new AishaAuthService();
    await authService.getTokens(code);
    res.send(
      "Authentication successful! You can close this window and restart Aisha."
    );
  } catch (error) {
    console.error("[/oauth2callback] Authentication failed:", error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

app.post("/aisha/initialize", async (req, res) => {
  try {
    await orchestrator.initialize();
    res.json({ success: true, message: "Aisha initialized" });
  } catch (error) {
    console.error("[/aisha/initialize] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/briefing/:userId", ensureInitialized, async (req, res) => {
  try {
    const briefing = await orchestrator.getMorningBriefing(req.params.userId);
    res.json(briefing);
  } catch (error) {
    console.error("[/aisha/briefing] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/email/search", ensureInitialized, async (req, res) => {
  const { query } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const results = await orchestrator.intelligentEmailSearch(query);
    res.json(results);
  } catch (error) {
    console.error("[/aisha/email/search] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/email/unread", ensureInitialized, async (req, res) => {
  const maxResults = Number.parseInt(req.query.maxResults ?? "5", 10);
  try {
    const emails = await orchestrator.getUnreadEmailSummary(maxResults);
    res.json({ emails });
  } catch (error) {
    console.error("[/aisha/email/unread] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/email/send", ensureInitialized, async (req, res) => {
  try {
    const result = await orchestrator.sendEmail(req.body ?? {});
    res.json({ success: true, result });
  } catch (error) {
    console.error("[/aisha/email/send] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/drive/search", ensureInitialized, async (req, res) => {
  const { query } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }
  try {
    const files = await orchestrator.searchDrive(query);
    res.json({ files });
  } catch (error) {
    console.error("[/aisha/drive/search] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/drive/recent", ensureInitialized, async (req, res) => {
  const pageSize = Number.parseInt(req.query.pageSize ?? "10", 10);
  try {
    const files = await orchestrator.listRecentDriveFiles(pageSize);
    res.json({ files });
  } catch (error) {
    console.error("[/aisha/drive/recent] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/drive/file/:fileId", ensureInitialized, async (req, res) => {
  try {
    const content = await orchestrator.getDriveFileContent(req.params.fileId);
    res.json({ content });
  } catch (error) {
    console.error("[/aisha/drive/file] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/drive/create", ensureInitialized, async (req, res) => {
  try {
    const file = await orchestrator.createDriveFile(req.body ?? {});
    res.json({ file });
  } catch (error) {
    console.error("[/aisha/drive/create] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/tasks", ensureInitialized, async (req, res) => {
  try {
    const lists = await orchestrator.getAllTasks();
    res.json({ lists });
  } catch (error) {
    console.error("[/aisha/tasks] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/tasks", ensureInitialized, async (req, res) => {
  try {
    const task = await orchestrator.createTask(req.body ?? {});
    res.json({ task });
  } catch (error) {
    console.error("[/aisha/tasks:create] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post(
  "/aisha/tasks/complete",
  ensureInitialized,
  async (req, res) => {
    try {
      const task = await orchestrator.completeTask(req.body ?? {});
      res.json({ task });
    } catch (error) {
      console.error("[/aisha/tasks/complete] Failed:", error);
      handleServiceError(res, error);
    }
  }
);

app.get("/aisha/contacts", ensureInitialized, async (req, res) => {
  const pageSize = Number.parseInt(req.query.pageSize ?? "25", 10);
  try {
    const contacts = await orchestrator.listContacts(pageSize);
    res.json({ contacts });
  } catch (error) {
    console.error("[/aisha/contacts] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/contacts/search", ensureInitialized, async (req, res) => {
  const { query } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }
  try {
    const results = await orchestrator.searchContacts(query);
    res.json({ results });
  } catch (error) {
    console.error("[/aisha/contacts/search] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/youtube/search", ensureInitialized, async (req, res) => {
  const { query, maxResults } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }
  try {
    const results = await orchestrator.searchYouTube(query, maxResults ?? 10);
    res.json({ results });
  } catch (error) {
    console.error("[/aisha/youtube/search] Failed:", error);
    handleServiceError(res, error);
  }
});

app.get("/aisha/youtube/playlists", ensureInitialized, async (req, res) => {
  try {
    const playlists = await orchestrator.getYouTubePlaylists();
    res.json({ playlists });
  } catch (error) {
    console.error("[/aisha/youtube/playlists] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post(
  "/aisha/youtube/playlist-videos",
  ensureInitialized,
  async (req, res) => {
    const { playlistId, maxResults } = req.body ?? {};
    if (!playlistId) {
      return res.status(400).json({ error: "playlistId is required" });
    }
    try {
      const videos = await orchestrator.getYouTubePlaylistVideos(
        playlistId,
        maxResults ?? 25
      );
      res.json({ videos });
    } catch (error) {
      console.error("[/aisha/youtube/playlist-videos] Failed:", error);
      handleServiceError(res, error);
    }
  }
);

app.post("/aisha/maps/directions", ensureInitialized, async (req, res) => {
  try {
    const route = await orchestrator.getDirections(req.body ?? {});
    res.json({ route });
  } catch (error) {
    console.error("[/aisha/maps/directions] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/maps/geocode", ensureInitialized, async (req, res) => {
  const { address } = req.body ?? {};
  if (!address) {
    return res.status(400).json({ error: "address is required" });
  }
  try {
    const location = await orchestrator.geocode(address);
    res.json({ location });
  } catch (error) {
    console.error("[/aisha/maps/geocode] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post(
  "/aisha/maps/reverse-geocode",
  ensureInitialized,
  async (req, res) => {
    const { lat, lng } = req.body ?? {};
    if (typeof lat === "undefined" || typeof lng === "undefined") {
      return res.status(400).json({ error: "lat and lng are required" });
    }
    try {
      const location = await orchestrator.reverseGeocode(lat, lng);
      res.json({ location });
    } catch (error) {
      console.error("[/aisha/maps/reverse-geocode] Failed:", error);
      handleServiceError(res, error);
    }
  }
);

app.post("/aisha/maps/nearby", ensureInitialized, async (req, res) => {
  const { lat, lng, radius, type } = req.body ?? {};
  if (typeof lat === "undefined" || typeof lng === "undefined") {
    return res.status(400).json({ error: "lat and lng are required" });
  }
  try {
    const places = await orchestrator.findNearbyPlaces({
      lat,
      lng,
      radius,
      type,
    });
    res.json({ places });
  } catch (error) {
    console.error("[/aisha/maps/nearby] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/maps/search", ensureInitialized, async (req, res) => {
  const { query } = req.body ?? {};
  if (!query) {
    return res.status(400).json({ error: "query is required" });
  }
  try {
    const results = await orchestrator.searchPlaces(query);
    res.json({ results });
  } catch (error) {
    console.error("[/aisha/maps/search] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/translate", ensureInitialized, async (req, res) => {
  try {
    const result = await orchestrator.translateText(req.body ?? {});
    res.json(result);
  } catch (error) {
    console.error("[/aisha/translate] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post(
  "/aisha/detect-language",
  ensureInitialized,
  async (req, res) => {
    const { text } = req.body ?? {};
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    try {
      const result = await orchestrator.detectLanguage(text);
      res.json(result);
    } catch (error) {
      console.error("[/aisha/detect-language] Failed:", error);
      handleServiceError(res, error);
    }
  }
);

app.post("/aisha/vision/analyze", ensureInitialized, async (req, res) => {
  const { imagePath, translate } = req.body ?? {};
  if (!imagePath) {
    return res.status(400).json({ error: "imagePath is required" });
  }

  try {
    const results = await orchestrator.processImage(imagePath, translate);
    res.json(results);
  } catch (error) {
    console.error("[/aisha/vision/analyze] Failed:", error);
    handleServiceError(res, error);
  }
});

app.post("/aisha/home/webhook", ensureInitialized, async (req, res) => {
  try {
    const intent = req.body?.queryResult?.intent?.displayName;
    const parameters = req.body?.queryResult?.parameters ?? {};
    let responseText = "How can I help you today?";

    switch (intent) {
      case "GetBriefing": {
        const briefing = await orchestrator.getMorningBriefing("user123");
        responseText = `You have ${briefing.unreadEmails} unread emails and ${briefing.totalTasks} pending tasks.`;
        break;
      }
      case "SearchEmails": {
        const emails = await orchestrator.intelligentEmailSearch(
          parameters.query
        );
        responseText = `I found ${emails.count} emails matching "${parameters.query}".`;
        break;
      }
      default:
        break;
    }

    res.json({ fulfillmentText: responseText });
  } catch (error) {
    console.error("[/aisha/home/webhook] Failed:", error);
    handleServiceError(res, error);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Aisha server running on port ${PORT}`);
  console.log(
    `📱 OAuth callback URL: http://localhost:${PORT}/oauth2callback`
  );
});

module.exports = app;


