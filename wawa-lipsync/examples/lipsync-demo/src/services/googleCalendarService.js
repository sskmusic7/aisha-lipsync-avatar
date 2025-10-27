// Google Calendar Service - UPDATED for Google Identity Services (GIS)
// This service handles Google Calendar integration for Aisha using the NEW OAuth library

class GoogleCalendarService {
  constructor() {
    this.clientId = null;
    this.apiKey = null;
    this.discoveryDoc = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.tokenClient = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.accessToken = null;
  }

  // Initialize Google API client
  async initialize() {
    if (this.gapiInited && this.gisInited) return true;

    try {
      console.log('🔄 Initializing Google Calendar service with NEW Google Identity Services...');
      
      // Get API credentials
      await this.loadCredentials();

      if (!this.clientId || !this.apiKey) {
        console.error('❌ Google Calendar API credentials not found');
        return false;
      }

      console.log('🔧 Initializing Google API client...');
      console.log('🔑 Using Client ID:', this.clientId?.substring(0, 30) + '...');
      console.log('🔑 Using API Key:', this.apiKey?.substring(0, 30) + '...');
      
      // Initialize gapi (for API calls only, not auth)
      await this.initializeGapi();
      
      // Initialize GIS (for OAuth)
      await this.initializeGis();

      console.log('✅ Google Calendar service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar service:', error);
      return false;
    }
  }

  // Initialize the gapi client for API calls
  async initializeGapi() {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        reject(new Error('gapi not loaded'));
        return;
      }

      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: this.apiKey,
            discoveryDocs: [this.discoveryDoc],
          });
          this.gapiInited = true;
          console.log('✅ gapi client initialized');
          resolve();
        } catch (error) {
          console.error('❌ Failed to initialize gapi client:', error);
          reject(error);
        }
      });
    });
  }

  // Initialize Google Identity Services (GIS) for OAuth
  async initializeGis() {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.error('❌ Google Identity Services not loaded');
        reject(new Error('Google Identity Services not loaded. Make sure the GSI script is included in your HTML.'));
        return;
      }

      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: (response) => {
            if (response.error !== undefined) {
              console.error('❌ Token error:', response);
              throw new Error(response.error);
            }
            this.accessToken = response.access_token;
            console.log('✅ Access token received');
          },
        });

        this.gisInited = true;
        console.log('✅ Google Identity Services initialized');
        resolve();
      } catch (error) {
        console.error('❌ Failed to initialize GIS:', error);
        reject(error);
      }
    });
  }

  // Load API credentials from environment or localStorage
  async loadCredentials() {
    console.log('🔍 Debugging environment variables...');
    console.log('All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
    console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('VITE_GOOGLE_API_KEY:', import.meta.env.VITE_GOOGLE_API_KEY);
    
    // Try environment variables first
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    
    // Fallback to GEMINI key ONLY if GOOGLE_API_KEY is not set
    if (!this.apiKey && import.meta.env.VITE_GEMINI_API_KEY) {
      console.warn('⚠️ VITE_GOOGLE_API_KEY not found, using VITE_GEMINI_API_KEY as fallback');
      this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    }
    
    console.log('🔑 Google Calendar Client ID:', this.clientId ? `Found: ${this.clientId.substring(0, 20)}...` : 'Not found ❌');
    console.log('🔑 Google Calendar API Key:', this.apiKey ? `Found: ${this.apiKey.substring(0, 20)}...` : 'Not found ❌');

    // If not in environment, try localStorage
    if (!this.clientId) {
      this.clientId = localStorage.getItem('google-client-id');
      console.log('🔑 Google Calendar Client ID from localStorage:', this.clientId ? 'Found ✅' : 'Not found ❌');
    }
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('google-api-key');
      console.log('🔑 Google Calendar API Key from localStorage:', this.apiKey ? 'Found ✅' : 'Not found ❌');
    }

    // If still not found, log warning
    if (!this.clientId || !this.apiKey) {
      console.warn('⚠️ Google Calendar not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in environment variables.');
    }
  }

  // Sign in to Google using NEW GIS flow
  async signIn() {
    console.log('🔑 Starting Google sign-in process with NEW Google Identity Services...');
    
    if (!this.gapiInited || !this.gisInited) {
      console.log('🔄 Service not initialized, initializing now...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Calendar service');
      }
    }

    if (!this.tokenClient) {
      throw new Error('Token client not initialized');
    }

    return new Promise((resolve, reject) => {
      try {
        // Set the callback for this specific sign-in request
        this.tokenClient.callback = async (response) => {
          if (response.error !== undefined) {
            console.error('❌ OAuth error:', response);
            reject(new Error(response.error));
            return;
          }
          
          this.accessToken = response.access_token;
          console.log('✅ Successfully signed in with access token');
          
          // Set the token for gapi requests
          window.gapi.client.setToken({
            access_token: this.accessToken
          });
          
          resolve();
        };

        // Check if we already have a valid token
        if (this.accessToken && window.gapi.client.getToken()) {
          console.log('✅ Already have valid token');
          resolve();
          return;
        }

        console.log('🚀 Requesting access token...');
        
        // Request an access token
        // For first-time sign in, use 'consent' to force account selection
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
        
      } catch (error) {
        console.error('❌ Sign-in failed:', error);
        reject(error);
      }
    });
  }

  // Sign out
  async signOut() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('✅ Token revoked');
      });
      this.accessToken = null;
    }
    
    if (window.gapi.client.getToken()) {
      window.gapi.client.setToken(null);
    }
  }

  // Check if user is signed in
  isUserSignedIn() {
    return !!this.accessToken && !!window.gapi.client.getToken();
  }

  // Get upcoming events
  async getUpcomingEvents(maxResults = 10) {
    if (!this.isUserSignedIn()) {
      await this.signIn();
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      
      // If token expired, try to sign in again
      if (error.status === 401) {
        console.log('🔄 Token expired, signing in again...');
        this.accessToken = null;
        await this.signIn();
        return this.getUpcomingEvents(maxResults);
      }
      
      throw error;
    }
  }

  // Get events for today
  async getTodaysEvents() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    if (!this.isUserSignedIn()) {
      await this.signIn();
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('❌ Error fetching today\'s events:', error);
      
      // If token expired, try to sign in again
      if (error.status === 401) {
        console.log('🔄 Token expired, signing in again...');
        this.accessToken = null;
        await this.signIn();
        return this.getTodaysEvents();
      }
      
      throw error;
    }
  }

  // Get events for a specific date range
  async getEventsForDateRange(startDate, endDate) {
    if (!this.isUserSignedIn()) {
      await this.signIn();
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('❌ Error fetching events for date range:', error);
      
      // If token expired, try to sign in again
      if (error.status === 401) {
        console.log('🔄 Token expired, signing in again...');
        this.accessToken = null;
        await this.signIn();
        return this.getEventsForDateRange(startDate, endDate);
      }
      
      throw error;
    }
  }

  // Format events for Aisha to read
  formatEventsForAisha(events) {
    if (!events || events.length === 0) {
      return "You have no upcoming events, bestie!";
    }

    const formattedEvents = events.map(event => {
      const start = event.start.dateTime || event.start.date;
      const startDate = new Date(start);
      const timeStr = event.start.dateTime ? 
        startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
        'All day';
      
      const dateStr = startDate.toLocaleDateString();
      
      return `• ${event.summary || 'No title'} - ${dateStr} at ${timeStr}`;
    }).join('\n');

    return `Here are your upcoming events:\n${formattedEvents}`;
  }

  // Clear stored credentials
  clearCredentials() {
    this.clientId = null;
    this.apiKey = null;
    this.accessToken = null;
    localStorage.removeItem('google-client-id');
    localStorage.removeItem('google-api-key');
  }
}

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService();
