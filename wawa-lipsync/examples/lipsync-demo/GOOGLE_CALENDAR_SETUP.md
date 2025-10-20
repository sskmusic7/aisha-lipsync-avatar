# Google Calendar Integration Setup Guide

## 🗓️ **Setting Up Google Calendar API for Aisha**

Aisha can now check your Google Calendar! Here's how to set it up:

### **Step 1: Enable Google Calendar API**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Calendar API" and enable it

### **Step 2: Create OAuth 2.0 Credentials**

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application** as the application type
4. Add your domain to **Authorized JavaScript origins**:
   - For local development: `http://localhost:5173`
   - For production: `https://yourdomain.com`
5. Copy the **Client ID** and **API Key**

### **Step 3: Configure Environment Variables**

Add these to your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_API_KEY=your_api_key_here
```

### **Step 4: Test the Integration**

1. Start your Aisha application
2. Ask Aisha: "What's on my calendar today?"
3. You'll be prompted to sign in to Google
4. Grant calendar access permissions
5. Aisha will now be able to check your schedule!

## 🎯 **Example Commands**

Try asking Aisha:

- "What do I have today?"
- "What's on my schedule?"
- "Show me my upcoming events"
- "Do I have any meetings today?"
- "What's my calendar looking like this week?"

## 🔒 **Privacy & Security**

- Aisha only requests **read-only** access to your calendar
- Your credentials are stored locally in your browser
- No calendar data is sent to external servers
- You can revoke access anytime in your Google Account settings

## 🛠️ **Troubleshooting**

**"I can't access your calendar right now"**
- Make sure you've enabled the Google Calendar API
- Check that your Client ID and API Key are correct
- Verify your domain is added to authorized origins

**"Sign in failed"**
- Clear your browser cache and try again
- Make sure pop-ups are allowed for your domain
- Check that OAuth consent screen is configured

## 🚀 **Next Steps**

Once calendar integration is working, you can extend Aisha to:
- Access Google Drive files
- Read Google Docs
- Send emails via Gmail API
- Manage tasks in Google Tasks

---

**Need help?** Check the browser console for detailed error messages!
