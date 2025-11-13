"use strict";

const fs = require("fs/promises");
const path = require("path");
const { google } = require("googleapis");
const vision = require("@google-cloud/vision");
const { Translate } = require("@google-cloud/translate").v2;
const admin = require("firebase-admin");

const TOKEN_DIR = path.resolve(__dirname, "../../tokens");
const TOKEN_FILE = path.join(TOKEN_DIR, "aisha-tokens.json");

/**
 * Core authentication service responsible for handling Google OAuth flows.
 */
class AishaAuthService {
  constructor({
    clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET,
    redirectUri = process.env.GOOGLE_REDIRECT_URI,
  } = {}) {
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.SCOPES = [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/tasks",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/youtube.readonly",
      // Note: homegraph scope requires special Google approval - removed for now
      // "https://www.googleapis.com/auth/homegraph",
      "https://www.googleapis.com/auth/cloud-platform",
    ];
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: this.SCOPES,
      prompt: "consent",
    });
  }

  async getTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    await this.saveTokens(tokens);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async saveTokens(tokens) {
    await fs.mkdir(TOKEN_DIR, { recursive: true });
    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");
  }

  async loadTokens() {
    const raw = await fs.readFile(TOKEN_FILE, "utf8");
    const tokens = JSON.parse(raw);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  getClient() {
    return this.oauth2Client;
  }
}

class AishaGmailService {
  constructor(authClient) {
    this.gmail = google.gmail({ version: "v1", auth: authClient });
  }

  async getUnreadEmails(maxResults = 10) {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
      maxResults,
    });

    if (!response.data.messages) {
      return [];
    }

    return Promise.all(
      response.data.messages.map((msg) => this.getEmailDetails(msg.id))
    );
  }

  async getEmailDetails(messageId) {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = response.data.payload.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "No Subject";
    const from = headers.find((h) => h.name === "From")?.value ?? "Unknown";
    const date = headers.find((h) => h.name === "Date")?.value ?? "";

    return {
      id: messageId,
      subject,
      from,
      date,
      snippet: response.data.snippet,
      threadId: response.data.threadId,
    };
  }

  async sendEmail(to, subject, body) {
    const message = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return response.data;
  }

  async searchEmails(query, maxResults = 20) {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults,
    });

    if (!response.data.messages) {
      return [];
    }

    return Promise.all(
      response.data.messages.map((msg) => this.getEmailDetails(msg.id))
    );
  }
}

class AishaDriveService {
  constructor(authClient) {
    this.drive = google.drive({ version: "v3", auth: authClient });
  }

  async listFiles(pageSize = 10, query) {
    const params = {
      pageSize,
      fields:
        "files(id, name, mimeType, createdTime, modifiedTime, webViewLink, iconLink)",
      orderBy: "modifiedTime desc",
    };

    if (query) {
      params.q = query;
    }

    const response = await this.drive.files.list(params);
    return response.data.files ?? [];
  }

  async searchFiles(searchTerm) {
    const query = `name contains '${searchTerm}' and trashed=false`;
    return this.listFiles(20, query);
  }

  async getFileContent(fileId) {
    const response = await this.drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    return response.data;
  }

  async createFile(name, content, mimeType = "text/plain") {
    const fileMetadata = { name };
    const media = { mimeType, body: content };

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: "id, name, webViewLink",
    });
    return response.data;
  }

  async shareFile(fileId, email, role = "reader") {
    const response = await this.drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role,
        emailAddress: email,
      },
    });
    return response.data;
  }
}

class AishaTasksService {
  constructor(authClient) {
    this.tasks = google.tasks({ version: "v1", auth: authClient });
  }

  async getTaskLists() {
    const response = await this.tasks.tasklists.list();
    return response.data.items ?? [];
  }

  async getTasks(taskListId) {
    const response = await this.tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
    });
    return response.data.items ?? [];
  }

  async getAllTasks() {
    const lists = await this.getTaskLists();
    const results = [];

    for (const list of lists) {
      const tasks = await this.getTasks(list.id);
      results.push({
        listName: list.title,
        listId: list.id,
        tasks,
      });
    }

    return results;
  }

  async createTask(taskListId, title, notes = "", dueDate) {
    const task = { title, notes };
    if (dueDate) {
      task.due = new Date(dueDate).toISOString();
    }

    const response = await this.tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: task,
    });
    return response.data;
  }

  async completeTask(taskListId, taskId) {
    const response = await this.tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: { status: "completed" },
    });
    return response.data;
  }

  async deleteTask(taskListId, taskId) {
    await this.tasks.tasks.delete({ tasklist: taskListId, task: taskId });
    return { success: true };
  }
}

class AishaContactsService {
  constructor(authClient) {
    this.people = google.people({ version: "v1", auth: authClient });
  }

  async getContacts(pageSize = 100) {
    const response = await this.people.people.connections.list({
      resourceName: "people/me",
      pageSize,
      personFields: "names,emailAddresses,phoneNumbers,organizations,photos",
    });
    return response.data.connections ?? [];
  }

  async searchContacts(query) {
    const response = await this.people.people.searchContacts({
      query,
      readMask: "names,emailAddresses,phoneNumbers,organizations",
    });
    return response.data.results ?? [];
  }

  async getContact(resourceName) {
    const response = await this.people.people.get({
      resourceName,
      personFields:
        "names,emailAddresses,phoneNumbers,organizations,addresses,birthdays",
    });
    return response.data;
  }
}

class AishaYouTubeService {
  constructor(authClient) {
    this.youtube = google.youtube({ version: "v3", auth: authClient });
  }

  async searchVideos(query, maxResults = 10) {
    const response = await this.youtube.search.list({
      part: "snippet",
      q: query,
      type: "video",
      maxResults,
      order: "relevance",
    });
    return response.data.items ?? [];
  }

  async getPlaylists() {
    const response = await this.youtube.playlists.list({
      part: "snippet,contentDetails",
      mine: true,
      maxResults: 25,
    });
    return response.data.items ?? [];
  }

  async getPlaylistVideos(playlistId, maxResults = 50) {
    const response = await this.youtube.playlistItems.list({
      part: "snippet",
      playlistId,
      maxResults,
    });
    return response.data.items ?? [];
  }

  async getSubscriptions() {
    const response = await this.youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50,
    });
    return response.data.items ?? [];
  }

  async getVideoDetails(videoId) {
    const response = await this.youtube.videos.list({
      part: "snippet,statistics,contentDetails",
      id: videoId,
    });
    return response.data.items?.[0] ?? null;
  }
}

class AishaMapsService {
  constructor(apiKey = process.env.GOOGLE_MAPS_API_KEY) {
    if (!apiKey) {
      throw new Error(
        "Missing GOOGLE_MAPS_API_KEY. Set it in the environment to enable Maps features."
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
  }

  async getJson(endpoint, params) {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries({ ...params, key: this.apiKey }).forEach(([k, v]) =>
      url.searchParams.append(k, v)
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Maps API request failed: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.error_message) {
      throw new Error(`Maps API error: ${data.error_message}`);
    }
    return data;
  }

  geocode(address) {
    return this.getJson("geocode/json", { address: address });
  }

  reverseGeocode(lat, lng) {
    return this.getJson("geocode/json", { latlng: `${lat},${lng}` });
  }

  getDirections(origin, destination, mode = "driving") {
    return this.getJson("directions/json", {
      origin,
      destination,
      mode,
    });
  }

  findNearbyPlaces(lat, lng, radius = 1000, type = "restaurant") {
    return this.getJson("place/nearbysearch/json", {
      location: `${lat},${lng}`,
      radius: String(radius),
      type,
    });
  }

  searchPlaces(query) {
    return this.getJson("place/textsearch/json", { query });
  }
}

class AishaVisionService {
  constructor(options = {}) {
    this.client = new vision.ImageAnnotatorClient(options);
  }

  async detectText(imagePath) {
    const [result] = await this.client.textDetection(imagePath);
    const detections = result.textAnnotations ?? [];
    return {
      fullText: detections[0]?.description ?? "",
      detections,
    };
  }

  async detectLabels(imagePath) {
    const [result] = await this.client.labelDetection(imagePath);
    return result.labelAnnotations ?? [];
  }

  async detectFaces(imagePath) {
    const [result] = await this.client.faceDetection(imagePath);
    return result.faceAnnotations ?? [];
  }

  async detectLandmarks(imagePath) {
    const [result] = await this.client.landmarkDetection(imagePath);
    return result.landmarkAnnotations ?? [];
  }

  async detectLogos(imagePath) {
    const [result] = await this.client.logoDetection(imagePath);
    return result.logoAnnotations ?? [];
  }

  async detectSafeSearch(imagePath) {
    const [result] = await this.client.safeSearchDetection(imagePath);
    return result.safeSearchAnnotation ?? null;
  }

  async analyzeImageUrl(imageUrl) {
    const [result] = await this.client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: "LABEL_DETECTION" },
        { type: "TEXT_DETECTION" },
        { type: "FACE_DETECTION" },
        { type: "OBJECT_LOCALIZATION" },
      ],
    });
    return result;
  }
}

class AishaTranslationService {
  constructor(options = {}) {
    this.translate = new Translate(options);
  }

  async translateText(text, targetLanguage) {
    const [translation] = await this.translate.translate(text, targetLanguage);
    return translation;
  }

  async detectLanguage(text) {
    const [detection] = await this.translate.detect(text);
    return {
      language: detection.language,
      confidence: detection.confidence,
    };
  }

  async getSupportedLanguages(target) {
    const [languages] = await this.translate.getLanguages(target);
    return languages;
  }

  async translateBatch(texts, targetLanguage) {
    const [translations] = await this.translate.translate(
      texts,
      targetLanguage
    );
    return translations;
  }
}

class AishaFirebaseService {
  constructor() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase configuration. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    this.db = admin.firestore();
    this.auth = admin.auth();
  }

  async saveConversation(userId, message, response) {
    const conversationRef = this.db.collection("conversations").doc();
    await conversationRef.set({
      userId,
      message,
      response,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    return conversationRef.id;
  }

  async getConversationHistory(userId, limit = 50) {
    const snapshot = await this.db
      .collection("conversations")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async saveUserPreferences(userId, preferences) {
    await this.db
      .collection("users")
      .doc(userId)
      .set(
        {
          preferences,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  async getUserPreferences(userId) {
    const doc = await this.db.collection("users").doc(userId).get();
    return doc.exists ? doc.data().preferences : null;
  }

  listenToCollection(collectionName, callback) {
    return this.db.collection(collectionName).onSnapshot((snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      callback(items);
    });
  }
}

class AishaHomeService {
  constructor(authClient) {
    this.homegraph = google.homegraph({ version: "v1", auth: authClient });
  }

  async reportState(agentUserId, devices) {
    const response = await this.homegraph.devices.reportStateAndNotification({
      requestBody: {
        agentUserId,
        payload: { devices },
      },
    });
    return response.data;
  }

  async requestSync(agentUserId) {
    const response = await this.homegraph.devices.requestSync({
      requestBody: { agentUserId },
    });
    return response.data;
  }

  async queryDevices(agentUserId, deviceIds) {
    const response = await this.homegraph.devices.query({
      requestBody: {
        agentUserId,
        inputs: [
          {
            payload: {
              devices: deviceIds.map((id) => ({ id })),
            },
          },
        ],
      },
    });
    return response.data;
  }
}

module.exports = {
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
  TOKEN_FILE,
};


