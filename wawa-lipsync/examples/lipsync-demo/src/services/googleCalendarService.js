// Google Calendar Service
// This service handles Google Calendar integration for Aisha

class GoogleCalendarService {
  constructor() {
    this.clientId = null;
    this.apiKey = null;
    this.discoveryDoc = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.gapi = null;
    this.isInitialized = false;
    this.isSignedIn = false;
  }

  // Initialize Google API client
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      // Get API credentials
      await this.loadCredentials();

      if (!this.clientId || !this.apiKey) {
        console.error('Google Calendar API credentials not found');
        return false;
      }

      // Initialize gapi client
      await window.gapi.load('client:auth2', async () => {
        await window.gapi.client.init({
          apiKey: this.apiKey,
          clientId: this.clientId,
          discoveryDocs: [this.discoveryDoc],
          scope: 'https://www.googleapis.com/auth/calendar.readonly'
        });

        this.gapi = window.gapi;
        this.isInitialized = true;
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize Google Calendar service:', error);
      return false;
    }
  }

  // Load Google API script
  loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Load API credentials from environment or prompt user
  async loadCredentials() {
    // Try environment variables first
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    console.log('🔑 Google Calendar Client ID:', this.clientId ? 'Found in environment ✅' : 'Not found ❌');
    console.log('🔑 Google Calendar API Key:', this.apiKey ? 'Found in environment ✅' : 'Not found ❌');

    // If not in environment, try localStorage
    if (!this.clientId) {
      this.clientId = localStorage.getItem('google-client-id');
      console.log('🔑 Google Calendar Client ID from localStorage:', this.clientId ? 'Found ✅' : 'Not found ❌');
    }
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('google-api-key');
      console.log('🔑 Google Calendar API Key from localStorage:', this.apiKey ? 'Found ✅' : 'Not found ❌');
    }

    // If still not found, don't prompt - just log warning
    if (!this.clientId || !this.apiKey) {
      console.warn('⚠️ Google Calendar not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in Netlify environment variables.');
      console.warn('ℹ️ Calendar features will not be available until configured.');
    }
  }

  // Prompt user for Google API credentials
  async promptForCredentials() {
    const instructions = `
To enable Google Calendar integration, you need to set up Google API credentials:

1. Go to https://console.developers.google.com/
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add your domain to authorized origins
6. Copy the Client ID and API Key

Enter your credentials below:
    `;

    const clientId = prompt(instructions + '\n\nEnter your Google Client ID:');
    const apiKey = prompt('Enter your Google API Key:');

    if (clientId && apiKey) {
      this.clientId = clientId;
      this.apiKey = apiKey;
      return true;
    }
    return false;
  }

  // Sign in to Google
  async signIn() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize Google Calendar service');
      }
    }

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      
      // Check if already signed in
      if (authInstance.isSignedIn.get()) {
        this.isSignedIn = true;
        return authInstance.currentUser.get();
      }
      
      // Sign in with popup for better mobile support
      const user = await authInstance.signIn({
        prompt: 'consent' // Force consent screen to ensure calendar permissions
      });
      
      this.isSignedIn = true;
      console.log('✅ Google Calendar: Successfully signed in');
      return user;
    } catch (error) {
      console.error('❌ Google Calendar sign in failed:', error);
      
      // Provide helpful error message
      if (error.error === 'popup_closed_by_user') {
        throw new Error('Please complete the Google sign-in process to access your calendar.');
      } else if (error.error === 'access_denied') {
        throw new Error('Calendar access was denied. Please grant calendar permissions when prompted.');
      } else {
        throw new Error(`Calendar sign-in failed: ${error.error || error.message}`);
      }
    }
  }

  // Sign out
  async signOut() {
    if (this.gapi && this.gapi.auth2) {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
    }
  }

  // Check if user is signed in
  isUserSignedIn() {
    if (!this.gapi || !this.gapi.auth2) return false;
    const authInstance = this.gapi.auth2.getAuthInstance();
    return authInstance.isSignedIn.get();
  }

  // Get upcoming events
  async getUpcomingEvents(maxResults = 10) {
    if (!this.isUserSignedIn()) {
      await this.signIn();
    }

    try {
      const response = await this.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
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
      const response = await this.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching today\'s events:', error);
      throw error;
    }
  }

  // Get events for a specific date range
  async getEventsForDateRange(startDate, endDate) {
    if (!this.isUserSignedIn()) {
      await this.signIn();
    }

    try {
      const response = await this.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.result.items || [];
    } catch (error) {
      console.error('Error fetching events for date range:', error);
      throw error;
    }
  }

  // Format events for Aisha to read
  formatEventsForAisha(events) {
    if (!events || events.length === 0) {
      return "You have no upcoming events.";
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
    localStorage.removeItem('google-client-id');
    localStorage.removeItem('google-api-key');
  }
}

// Create and export a singleton instance
export const googleCalendarService = new GoogleCalendarService();
