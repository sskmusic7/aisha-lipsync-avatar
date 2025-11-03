# 🔧 Netlify Environment Variables Setup Guide

## ✅ **Local Environment - COMPLETED**

Your `.env` and `.env.local` files have been updated with:
- ✅ `VITE_GOOGLE_CLIENT_ID`
- ✅ `VITE_GOOGLE_API_KEY`
- ✅ `VITE_GEMINI_API_KEY`

## 🚀 **Next Step: Configure Netlify**

### **Method 1: Using Netlify Dashboard**

1. Go to https://app.netlify.com
2. Select your site: **aishamk1**
3. Go to **Site configuration** → **Environment variables**
4. Add these variables:

```
VITE_GOOGLE_CLIENT_ID=287783957820-4ovnfifi2khak78ldomnj7o7pih46nle.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY
VITE_GEMINI_API_KEY=AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY
VITE_ELEVENLABS_API_KEY=sk_af16cdbcdea48bf817dc0b8af3af0c985e63f32f6099515b
```

5. Click **Save**
6. **Trigger a new deployment** (or wait for next git push)

### **Method 2: Using Netlify CLI**

```bash
# Install Netlify CLI if needed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables
netlify env:set VITE_GOOGLE_CLIENT_ID "287783957820-4ovnfifi2khak78ldomnj7o7pih46nle.apps.googleusercontent.com"
netlify env:set VITE_GOOGLE_API_KEY "AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY"
netlify env:set VITE_GEMINI_API_KEY "AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY"
netlify env:set VITE_ELEVENLABS_API_KEY "sk_af16cdbcdea48bf817dc0b8af3af0c985e63f32f6099515b"

# Trigger deployment
netlify deploy --prod
```

## 🧪 **Test Locally**

After updating your environment variables, test locally:

```bash
cd wawa-lipsync/examples/lipsync-demo
npm run dev
```

Then open http://localhost:5173 and check the browser console for:
```
🔑 Gemini API Key check: Found in environment variables ✅
🔑 Google Calendar Client ID: Found: 287783957820-4... ✅
🔑 Google Calendar API Key: Found: AIzaSyBt1Cj68HX... ✅
```

## 📋 **Verify Environment Variables**

Your current setup:

### Local Files:
- ✅ `/wawa-lipsync/examples/lipsync-demo/.env`
- ✅ `/wawa-lipsync/examples/lipsync-demo/.env.local`

### Environment Variables Set:
```env
VITE_GOOGLE_CLIENT_ID=287783957820-4ovnfifi2khak78ldomnj7o7pih46nle.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY
VITE_GEMINI_API_KEY=AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY
```

## 🔍 **What's Fixed**

1. ✅ Created `.env` file with Google OAuth credentials
2. ✅ Updated `.env.local` with full Client ID
3. ✅ Updated `google-calendar-test.html` with working credentials
4. ✅ Used the correct full Client ID (not truncated)

## 🎯 **Next Steps**

1. **Set variables in Netlify** (see above)
2. **Redeploy** your site
3. **Test OAuth** by asking Aisha: "What's on my calendar today?"
4. **Check browser console** for OAuth logs

## 🐛 **If OAuth Still Doesn't Work**

After setting environment variables, if OAuth still fails:

1. **Check OAuth client settings** in Google Cloud Console:
   - Go to https://console.cloud.google.com
   - Navigate to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client
   - Add authorized origins:
     - `https://aishamk1.netlify.app`
     - `https://localhost:5173` (for local testing)
     - `http://localhost:5173` (for local testing)
   
2. **Wait 5-10 minutes** for OAuth changes to propagate

3. **Hard refresh** the browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

4. **Test with the test file**: Open `google-calendar-test.html` in your browser

## 📝 **Important Notes**

- The `.env` files are in `.gitignore` (won't be committed to GitHub)
- Netlify environment variables are separate from local `.env` files
- You need to set environment variables in BOTH local and Netlify
- Environment variable changes require a new deployment








