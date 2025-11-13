"use strict";

const BASE_URL =
  import.meta.env.VITE_AISHA_BACKEND_URL || "http://localhost:3000";

// Log the backend URL being used (only in development)
if (import.meta.env.DEV) {
  console.log("[AishaBackend] Using backend URL:", BASE_URL);
}

const defaultHeaders = {
  "Content-Type": "application/json",
};

async function request(path, { method = "POST", body, headers = {} } = {}) {
  const url = `${BASE_URL}${path}`;
  
  // Log requests in development
  if (import.meta.env.DEV) {
    console.log("[AishaBackend] Request:", method, url);
  }
  
  const options = {
    method,
    headers: { ...defaultHeaders, ...headers },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message =
        errorPayload.error ||
        response.statusText ||
        "Unknown error calling Aisha backend";
      const error = new Error(message);
      error.status = response.status;
      error.payload = errorPayload;
      throw error;
    }
    return response.json().catch(() => ({}));
  } catch (error) {
    // Handle network/CSP errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("[AishaBackend] Network error:", error.message);
      console.error("[AishaBackend] Attempted URL:", url);
      console.error("[AishaBackend] Check CSP settings and backend URL configuration");
      throw new Error(
        `Cannot connect to backend at ${BASE_URL}. ` +
        `Check that the backend is running and CSP allows connections to this URL.`
      );
    }
    throw error;
  }
}

export async function initializeBackend() {
  return request("/aisha/initialize");
}

export async function getAuthUrl() {
  const response = await fetch(`${BASE_URL}/aisha/auth-url`, { method: "GET" });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message =
      errorPayload.error ||
      response.statusText ||
      "Unknown error getting auth URL";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function searchEmails(query) {
  return request("/aisha/email/search", { body: { query } });
}

export async function getUnreadEmails(maxResults = 5) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  return request(`/aisha/email/unread?${params.toString()}`, { method: "GET" });
}

export async function searchDrive(query) {
  return request("/aisha/drive/search", { body: { query } });
}

export async function listRecentDriveFiles(pageSize = 10) {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  return request(`/aisha/drive/recent?${params.toString()}`, { method: "GET" });
}

export async function getDirections({ origin, destination, mode = "driving" }) {
  return request("/aisha/maps/directions", {
    body: { origin, destination, mode },
  });
}

export async function searchPlaces(query) {
  return request("/aisha/maps/search", { body: { query } });
}

export async function analyzeImage(imagePath, translate = false) {
  return request("/aisha/vision/analyze", { body: { imagePath, translate } });
}

export async function translateText(text, targetLanguage) {
  return request("/aisha/translate", { body: { text, targetLanguage } });
}

export async function detectLanguage(text) {
  return request("/aisha/detect-language", { body: { text } });
}

export async function searchYouTube(query, maxResults = 5) {
  return request("/aisha/youtube/search", { body: { query, maxResults } });
}

export async function searchContacts(query) {
  return request("/aisha/contacts/search", { body: { query } });
}

export async function getTasks() {
  return request("/aisha/tasks", { method: "GET" });
}


