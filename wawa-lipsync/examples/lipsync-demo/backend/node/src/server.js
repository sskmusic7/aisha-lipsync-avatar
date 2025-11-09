"use strict";

const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { AishaAuthService } = require("./services");
const { AishaOrchestrator } = require("./orchestrator");

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
    res.status(500).json({ error: error.message });
  }
});

app.get("/aisha/briefing/:userId", ensureInitialized, async (req, res) => {
  try {
    const briefing = await orchestrator.getMorningBriefing(req.params.userId);
    res.json(briefing);
  } catch (error) {
    console.error("[/aisha/briefing] Failed:", error);
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Aisha server running on port ${PORT}`);
  console.log(
    `📱 OAuth callback URL: http://localhost:${PORT}/oauth2callback`
  );
});

module.exports = app;


