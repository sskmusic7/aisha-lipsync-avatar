# 🚀 Netlify Deployment Guide - A.Isha Lipsync Avatar

## 📦 Environment Variables Setup

Your app now supports environment variables! Set these in Netlify for production deployment.

### Required Environment Variables

Add these in your Netlify dashboard:

1. **`VITE_GEMINI_API_KEY`**
   - Your Google Gemini API key
   - Get it from: https://aistudio.google.com/app/apikey
   - Example: `AIzaSyAbc123...`

2. **`VITE_GCP_TTS_API_KEY`**
   - Your Google Cloud Text-to-Speech API key
   - Get it from: https://console.cloud.google.com/apis/credentials
   - Required for lip-sync to work
   - Example: `AIzaSyDef456...`

---

## 🔧 How to Set Environment Variables in Netlify

### Method 1: Via Netlify Dashboard (Recommended)

1. **Deploy your site first** (drag `dist` folder to Netlify Drop)
2. Go to your site dashboard: **https://app.netlify.com**
3. Click on your site
4. Go to **Site configuration** → **Environment variables**
5. Click **Add a variable**
6. Add both variables:
   ```
   Key: VITE_GEMINI_API_KEY
   Value: [Your Gemini API key]
   
   Key: VITE_GCP_TTS_API_KEY
   Value: [Your Google Cloud TTS API key]
   ```
7. Click **Save**
8. **Trigger a new deploy** (Settings → Deploys → Trigger deploy → Deploy site)

### Method 2: Via Netlify CLI

```bash
cd "/Users/sskmusic/WAWA LIPSYNC/wawa-lipsync/examples/lipsync-demo"

# Set environment variables
npx netlify-cli env:set VITE_GEMINI_API_KEY "your-gemini-api-key-here"
npx netlify-cli env:set VITE_GCP_TTS_API_KEY "your-gcp-tts-api-key-here"

# Redeploy
npx netlify-cli deploy --prod --dir=dist
```

---

## 🎯 Priority System

The app checks for API keys in this order:

1. **Environment Variables** (Netlify) ✅ Production
2. **localStorage** (Browser) ✅ Local development
3. **User Prompt** (Fallback) ⚠️ Manual entry

---

## 🚀 Deployment Steps

### Step 1: Build with Environment Support ✅
```bash
cd "/Users/sskmusic/WAWA LIPSYNC/wawa-lipsync/examples/lipsync-demo"
npm run build
```

### Step 2: Deploy to Netlify

**Option A: Netlify Drop (Easiest)**
1. Go to: https://app.netlify.com/drop
2. Drag the `dist` folder
3. Note your site URL (e.g., `https://random-name-123.netlify.app`)

**Option B: Netlify CLI**
```bash
npx netlify-cli deploy --prod --dir=dist
```

### Step 3: Add Environment Variables

1. Go to your site in Netlify dashboard
2. **Site configuration** → **Environment variables**
3. Add `VITE_GEMINI_API_KEY` and `VITE_GCP_TTS_API_KEY`
4. **Trigger new deploy** to apply changes

### Step 4: Test Your Live Site! 🎉

Visit your site URL and:
- ✅ No prompts for API keys (they're from env vars)
- ✅ AI chat works
- ✅ Lip-sync animations work
- ✅ Voice input/output work

---

## 🔐 Security Notes

### ✅ Good Practices
- Store API keys in Netlify environment variables
- Never commit API keys to git
- Use `.env.local` for local development (gitignored)

### ⚠️ Important
- Vite exposes `VITE_*` variables to the browser
- These are **visible in the client-side code**
- For production apps with billing, use a backend proxy

### 🛡️ Rate Limiting
Both Google APIs have free tiers with limits:
- **Gemini**: 60 requests/minute
- **Cloud TTS**: 1 million characters/month free

---

## 🐛 Troubleshooting

### Issue: "No API key found" after setting env vars
- **Solution**: Trigger a new deploy after adding env vars
- Environment changes require a rebuild

### Issue: Lip-sync not working on deployed site
- **Solution**: Make sure `VITE_GCP_TTS_API_KEY` is set
- Check browser console for "Using API key from environment variables"

### Issue: API quota exceeded
- **Solution**: Check your Google Cloud Console quotas
- Consider implementing rate limiting

---

## 📝 Local Development

For local development, you can use a `.env.local` file:

```bash
# /Users/sskmusic/WAWA LIPSYNC/wawa-lipsync/examples/lipsync-demo/.env.local
VITE_GEMINI_API_KEY=your-gemini-key-here
VITE_GCP_TTS_API_KEY=your-gcp-tts-key-here
```

Then run:
```bash
npm run dev
```

The app will automatically use these keys!

---

## ✅ Checklist

- [ ] Build completed: `npm run build`
- [ ] Deployed to Netlify (Drop or CLI)
- [ ] Environment variables added in Netlify
- [ ] New deploy triggered
- [ ] Tested live site
- [ ] AI chat works
- [ ] Lip-sync works
- [ ] No API key prompts

---

## 🎉 You're Done!

Your A.Isha avatar is now live with:
- 🔐 Secure API key management via Netlify
- 🗣️ AI-powered conversations
- 👄 Real-time lip-sync
- 🎤 Voice input/output
- 🌐 Accessible from anywhere

**Share your live site URL!** 🚀


