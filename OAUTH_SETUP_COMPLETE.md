# ✅ OAuth Setup Complete - Configure These in Netlify NOW

## 🔑 **Environment Variables to Set in Netlify:**

Go to: https://app.netlify.com → Your site → **Site configuration** → **Environment variables**

Add these:

```
VITE_GOOGLE_CLIENT_ID=287783957820-4ovnfifi2khak78ldomnj7o7pih46nle.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyBt1Cj68HX_2xTJgL18YP8pJDnuZ_7OOWY
VITE_GEMINI_API_KEY=AIzaSyDosoGe0jqxhVRQZkTLoo_jUp4wsInuDhs
VITE_ELEVENLABS_API_KEY=sk_af16cdbcdea48bf817dc0b8af3af0c985e63f32f6099515b
```

## 🚀 **Then Trigger a New Deployment**

After setting environment variables, either:
- Push any commit to GitHub (auto-deploys)
- Or manually trigger: **Site configuration** → **Build & deploy** → **Trigger deploy**

## 🧪 **Test on Your Live Site:**

1. After deployment completes (2-3 minutes)
2. Go to: https://aishamk1.netlify.app
3. Ask: "What's on my calendar today?"
4. Sign in with Google when prompted
5. Grant calendar permissions
6. Should work! ✅

## 📋 **Current Configuration:**

✅ Environment files updated locally  
✅ OAuth Client ID configured  
✅ Google API Key configured  
✅ Gemini API Key configured (NEW: `AIzaSyDosoGe0jqxhVRQZkTLoo_jUp4wsInuDhs`)  
✅ Cookie policy error fixed  
✅ Code ready to deploy  

## ⚠️ **Important:**

The OAuth Client needs to have these **Authorized JavaScript origins** in Google Cloud Console:
- ✅ `http://localhost:5173` (already added)
- ✅ `http://localhost:3000` (already added)
- ✅ `https://aishamk1.netlify.app` (already added)
- ⚠️ `http://localhost:8000` (OPTIONAL - only if testing on HTTP server)

**You DON'T need to add localhost:8000 unless you want to test there.**

## 🎯 **Next Steps:**

1. **Set environment variables in Netlify** (see above)
2. **Deploy** (push to GitHub or trigger manually)
3. **Test** at https://aishamk1.netlify.app
4. **Done!** 🎉








