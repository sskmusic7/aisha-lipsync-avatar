"use strict";

const {
  AishaAuthService,
  AishaGmailService,
  AishaDriveService,
  AishaTasksService,
  AishaContactsService,
  AishaYouTubeService,
  AishaMapsService,
  AishaVisionService,
  AishaTranslationService,
  AishaFirebaseService,
  AishaHomeService,
} = require("./services");

class AishaOrchestrator {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.authService = null;
    this.gmail = null;
    this.drive = null;
    this.tasks = null;
    this.contacts = null;
    this.youtube = null;
    this.maps = null;
    this.vision = null;
    this.translation = null;
    this.firebase = null;
    this.home = null;
  }

  async initialize() {
    this.authService = new AishaAuthService();

    try {
      await this.authService.loadTokens();
    } catch (error) {
      this.logger.error(
        "[AishaOrchestrator] No OAuth tokens found. Authenticate and retry.",
        error.message
      );
      throw error;
    }

    const authClient = this.authService.getClient();

    this.gmail = new AishaGmailService(authClient);
    this.drive = new AishaDriveService(authClient);
    this.tasks = new AishaTasksService(authClient);
    this.contacts = new AishaContactsService(authClient);
    this.youtube = new AishaYouTubeService(authClient);
    this.home = new AishaHomeService(authClient);

    try {
      this.maps = new AishaMapsService();
    } catch (err) {
      this.logger.warn(
        "[AishaOrchestrator] Maps service not initialized:",
        err.message
      );
    }

    try {
      this.vision = new AishaVisionService();
    } catch (err) {
      this.logger.warn(
        "[AishaOrchestrator] Vision service not initialized:",
        err.message
      );
    }

    try {
      this.translation = new AishaTranslationService();
    } catch (err) {
      this.logger.warn(
        "[AishaOrchestrator] Translation service not initialized:",
        err.message
      );
    }

    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      try {
        this.firebase = new AishaFirebaseService();
      } catch (err) {
        this.logger.warn(
          "[AishaOrchestrator] Firebase service not initialized:",
          err.message
        );
      }
    } else {
      this.logger.info(
        "[AishaOrchestrator] Firebase env vars missing. Skipping Firebase service."
      );
    }

    this.logger.info("✅ Aisha services initialized successfully");
  }

  async getMorningBriefing(userId) {
    const [emails, tasks] = await Promise.all([
      this.gmail ? this.gmail.getUnreadEmails(5) : [],
      this.tasks ? this.tasks.getAllTasks() : [],
      // Calendar integration can be added here later
    ]);

    const briefing = {
      timestamp: new Date().toISOString(),
      unreadEmails: emails.length,
      emailSummary: emails.map((e) => ({
        from: e.from,
        subject: e.subject,
      })),
      tasks: tasks.filter((list) => list.tasks.length > 0),
      totalTasks: tasks.reduce((sum, list) => sum + list.tasks.length, 0),
    };

    if (this.firebase) {
      try {
        await this.firebase.saveConversation(userId, "morning_briefing", briefing);
      } catch (err) {
        this.logger.warn(
          "[AishaOrchestrator] Failed to persist briefing:",
          err.message
        );
      }
    }

    return briefing;
  }

  async intelligentEmailSearch(query) {
    const emails = this.gmail ? await this.gmail.searchEmails(query) : [];
    return {
      query,
      count: emails.length,
      results: emails,
    };
  }

  async processImage(imagePath, translate = false) {
    if (!this.vision) {
      throw new Error("Vision service not configured.");
    }

    const detections = await Promise.all([
      this.vision.detectText(imagePath),
      this.vision.detectLabels(imagePath),
      this.vision.detectFaces(imagePath),
    ]);

    const [text, labels, faces] = detections;

    let translatedText = null;
    if (translate && text.fullText && this.translation) {
      try {
        const detection = await this.translation.detectLanguage(text.fullText);
        if (detection.language !== "en") {
          translatedText = await this.translation.translateText(
            text.fullText,
            "en"
          );
        }
      } catch (err) {
        this.logger.warn(
          "[AishaOrchestrator] Translation failed:",
          err.message
        );
      }
    }

    return {
      text: text.fullText,
      translatedText,
      labels: labels.map((l) => l.description),
      faceCount: faces.length,
      hasFaces: faces.length > 0,
    };
  }
}

module.exports = {
  AishaOrchestrator,
};


