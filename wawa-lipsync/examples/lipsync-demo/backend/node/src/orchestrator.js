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

  ensureService(service, name) {
    if (!service) {
      const message = `${name} service not configured.`;
      this.logger.warn(`[AishaOrchestrator] ${message}`);
      const error = new Error(message);
      error.code = "SERVICE_NOT_CONFIGURED";
      throw error;
    }
    return service;
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

  async getUnreadEmailSummary(maxResults = 5) {
    const gmail = this.ensureService(this.gmail, "Gmail");
    return gmail.getUnreadEmails(maxResults);
  }

  async sendEmail({ to, subject, body }) {
    if (!to || !subject || !body) {
      throw new Error("to, subject, and body are required to send email.");
    }
    const gmail = this.ensureService(this.gmail, "Gmail");
    return gmail.sendEmail(to, subject, body);
  }

  async searchDrive(query) {
    if (!query) {
      throw new Error("query is required to search Drive.");
    }
    const drive = this.ensureService(this.drive, "Drive");
    return drive.searchFiles(query);
  }

  async listRecentDriveFiles(pageSize = 10) {
    const drive = this.ensureService(this.drive, "Drive");
    return drive.listFiles(pageSize);
  }

  async createDriveFile({ name, content, mimeType }) {
    if (!name || typeof content === "undefined") {
      throw new Error("name and content are required to create a Drive file.");
    }
    const drive = this.ensureService(this.drive, "Drive");
    return drive.createFile(name, content, mimeType);
  }

  async getDriveFileContent(fileId) {
    if (!fileId) {
      throw new Error("fileId is required to fetch Drive file content.");
    }
    const drive = this.ensureService(this.drive, "Drive");
    return drive.getFileContent(fileId);
  }

  async getAllTasks() {
    const tasks = this.ensureService(this.tasks, "Tasks");
    return tasks.getAllTasks();
  }

  async createTask({ taskListId, title, notes, dueDate }) {
    if (!taskListId || !title) {
      throw new Error("taskListId and title are required to create a task.");
    }
    const tasks = this.ensureService(this.tasks, "Tasks");
    return tasks.createTask(taskListId, title, notes, dueDate);
  }

  async completeTask({ taskListId, taskId }) {
    if (!taskListId || !taskId) {
      throw new Error("taskListId and taskId are required to complete a task.");
    }
    const tasks = this.ensureService(this.tasks, "Tasks");
    return tasks.completeTask(taskListId, taskId);
  }

  async searchContacts(query) {
    if (!query) {
      throw new Error("query is required to search contacts.");
    }
    const contacts = this.ensureService(this.contacts, "Contacts");
    return contacts.searchContacts(query);
  }

  async listContacts(pageSize = 100) {
    const contacts = this.ensureService(this.contacts, "Contacts");
    return contacts.getContacts(pageSize);
  }

  async searchYouTube(query, maxResults = 10) {
    if (!query) {
      throw new Error("query is required to search YouTube.");
    }
    const youtube = this.ensureService(this.youtube, "YouTube");
    return youtube.searchVideos(query, maxResults);
  }

  async getYouTubePlaylists() {
    const youtube = this.ensureService(this.youtube, "YouTube");
    return youtube.getPlaylists();
  }

  async getYouTubePlaylistVideos(playlistId, maxResults = 25) {
    if (!playlistId) {
      throw new Error("playlistId is required to fetch playlist videos.");
    }
    const youtube = this.ensureService(this.youtube, "YouTube");
    return youtube.getPlaylistVideos(playlistId, maxResults);
  }

  async getDirections({ origin, destination, mode = "driving" }) {
    if (!origin || !destination) {
      throw new Error("origin and destination are required for directions.");
    }
    const maps = this.ensureService(this.maps, "Maps");
    const data = await maps.getDirections(origin, destination, mode);
    return data.routes?.[0] ?? null;
  }

  async geocode(address) {
    if (!address) {
      throw new Error("address is required for geocoding.");
    }
    const maps = this.ensureService(this.maps, "Maps");
    const data = await maps.geocode(address);
    return data.results?.[0] ?? null;
  }

  async reverseGeocode(lat, lng) {
    if (typeof lat === "undefined" || typeof lng === "undefined") {
      throw new Error("lat and lng are required for reverse geocoding.");
    }
    const maps = this.ensureService(this.maps, "Maps");
    const data = await maps.reverseGeocode(lat, lng);
    return data.results?.[0] ?? null;
  }

  async findNearbyPlaces({ lat, lng, radius, type }) {
    if (typeof lat === "undefined" || typeof lng === "undefined") {
      throw new Error("lat and lng are required to find nearby places.");
    }
    const maps = this.ensureService(this.maps, "Maps");
    const data = await maps.findNearbyPlaces(lat, lng, radius, type);
    return data.results ?? [];
  }

  async searchPlaces(query) {
    if (!query) {
      throw new Error("query is required to search places.");
    }
    const maps = this.ensureService(this.maps, "Maps");
    const data = await maps.searchPlaces(query);
    return data.results ?? [];
  }

  async translateText({ text, targetLanguage }) {
    if (!text || !targetLanguage) {
      throw new Error("text and targetLanguage are required for translation.");
    }
    const translation = this.ensureService(
      this.translation,
      "Translation"
    );
    const translated = await translation.translateText(text, targetLanguage);
    return { translatedText: translated };
  }

  async detectLanguage(text) {
    if (!text) {
      throw new Error("text is required for language detection.");
    }
    const translation = this.ensureService(
      this.translation,
      "Translation"
    );
    return translation.detectLanguage(text);
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


