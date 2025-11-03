# 🔍 OAuth Audit: Working Deployment vs Current Code

## Working Deployment Info
- **Deploy ID**: `68fff699d19aca00087af717`
- **Commit**: `4787f313b121ee884257db4067a87e1f8811d2ee`
- **Status**: ✅ OAuth working perfectly
- **Date**: Oct 27, 2025
- **URL**: https://aishamk1.netlify.app

---

## 📋 CRITICAL DIFFERENCES FOUND

### 1. **index.html - CSP `connect-src` Directive**

#### ✅ WORKING DEPLOYMENT (4787f313):
```html
connect-src 'self' ws://localhost:* wss://localhost:* https://apis.google.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://www.gstatic.com https://*.gstatic.com https://generativelanguage.googleapis.com https://texttospeech.googleapis.com https://api.elevenlabs.io blob: wss:;
```

#### ❌ CURRENT CODE:
```html
connect-src 'self' https://apis.google.com https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://www.gstatic.com https://*.gstatic.com https://generativelanguage.googleapis.com https://texttospeech.googleapis.com https://api.elevenlabs.io blob: wss:;
```

**DIFFERENCE**: 
- **Working**: Has `ws://localhost:* wss://localhost:*` 
- **Current**: Missing `ws://localhost:* wss://localhost:*`

**IMPACT**: This could be blocking OAuth popup iframes or redirects on Netlify. The `wss:` is there but `ws://localhost:*` specifically might be needed.

---

### 2. **index.html - MediaPipe Scripts**

#### ✅ WORKING DEPLOYMENT (4787f313):
```html
<!-- MediaPipe for browser-based eye tracking -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js" crossorigin="anonymous"></script>
<script type="importmap">
  {
    "imports": {
      "@mediapipe/tasks-vision": "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js"
    }
  }
</script>
```

#### ❌ CURRENT CODE:
```html
<!-- MediaPipe scripts REMOVED -->
```

**DIFFERENCE**: 
- **Working**: Has MediaPipe CDN scripts loaded
- **Current**: MediaPipe scripts completely removed (moved to npm package)

**IMPACT**: Probably not related to OAuth, but could affect face tracking features.

---

### 3. **googleCalendarService.js - `initializeGis()` Method**

#### ✅ WORKING DEPLOYMENT (4787f313):
```javascript
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
```

#### ❌ CURRENT CODE:
```javascript
async initializeGis() {
  return new Promise((resolve, reject) => {
    // Check if GSI script is loaded - wait a bit if not ready
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkAndInit = () => {
      if (!window.google) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏳ Waiting for Google Identity Services to load... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkAndInit, 500);
          return;
        }
        console.error('❌ Google Identity Services not loaded after', maxAttempts, 'attempts');
        // ... more error logging
        reject(new Error('Google Identity Services not loaded. Make sure the GSI script is included in your HTML.'));
        return;
      }
      // ... more checks and logging
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          // ... same config
        });
        // ... more logging
      } catch (error) {
        // ... more error details
      }
    };
    checkAndInit();
  });
}
```

**DIFFERENCE**: 
- **Working**: Simple immediate check, fails fast if GSI not loaded
- **Current**: Added retry logic (10 attempts, 500ms intervals), more verbose logging

**IMPACT**: 
- The retry logic SHOULD help, but if there's a CSP blocking issue, it won't matter
- The extra logging is good for debugging but shouldn't affect functionality
- **However**: The retry logic might mask the real issue if CSP is blocking script loading

---

### 4. **googleCalendarService.js - `signIn()` Method**

#### ✅ WORKING DEPLOYMENT (4787f313):
```javascript
console.log('🚀 Requesting access token...');

// Request an access token
// For first-time sign in, use 'consent' to force account selection
this.tokenClient.requestAccessToken({ prompt: 'consent' });
```

#### ❌ CURRENT CODE:
```javascript
console.log('🚀 Requesting access token...');
console.log('🔍 Token client:', this.tokenClient ? 'Found ✅' : 'Missing ❌');
console.log('🔍 Client ID:', this.clientId ? `${this.clientId.substring(0, 30)}...` : 'Missing ❌');

// Request an access token
// For first-time sign in, use 'consent' to force account selection
try {
  this.tokenClient.requestAccessToken({ prompt: 'consent' });
  console.log('✅ OAuth popup requested - check for popup blocker if it doesn\'t appear!');
} catch (error) {
  console.error('❌ Error requesting access token:', error);
  reject(new Error(`Failed to request OAuth token: ${error.message}`));
}
```

**DIFFERENCE**: 
- **Working**: Simple request, no try-catch
- **Current**: Wrapped in try-catch, more logging

**IMPACT**: Should be fine, just better error handling.

---

## 🎯 ROOT CAUSE ANALYSIS

### **Most Likely Issue: CSP Missing `ws://localhost:*`**

The working deployment has `ws://localhost:* wss://localhost:*` in `connect-src`, but current code does not.

**Why This Matters:**
- OAuth popups might use WebSocket connections for communication
- Google Identity Services might need `ws://` protocols for certain flows
- Even though `wss:` is allowed, `ws://localhost:*` might be required for redirect handling

### **Secondary Issue: Retry Logic Might Mask Real Problem**

The current code has retry logic that waits 5 seconds for GSI to load. If CSP is blocking the script, the retry will just delay the failure rather than show the real issue.

---

## 📝 RECOMMENDATIONS

### **Immediate Fix:**
1. **Restore `ws://localhost:* wss://localhost:*` to CSP `connect-src`**
   - This matches the working deployment exactly
   - Even though it says "localhost", it might be needed for OAuth flow

### **Verification:**
2. **Test after CSP fix**
   - OAuth should work immediately if CSP was the issue
   - If still failing, the extra logging will help diagnose

### **Consider:**
3. **Revert `initializeGis()` retry logic** (optional)
   - Working version has simpler immediate check
   - Retry logic is nice-to-have but might mask issues
   - Can keep the extra logging for debugging

---

## ✅ FILES TO UPDATE

1. `wawa-lipsync/examples/lipsync-demo/index.html`
   - Add `ws://localhost:* wss://localhost:*` back to `connect-src`

2. `wawa-lipsync/examples/lipsync-demo/src/services/googleCalendarService.js` (optional)
   - Consider simplifying `initializeGis()` to match working version
   - Or keep retry logic but ensure CSP is correct first

---

## 🔍 COMMIT HISTORY CONTEXT

- `410f389` - "Fix Google Calendar OAuth" - First OAuth fix
- `4787f313` - "Fix MediaPipe FaceMesh API" - **THIS IS THE WORKING DEPLOYMENT**
- `9458ab2` - "Revert CSP to working OAuth version (410f389)" - Reverted to 410f389, NOT 4787f313!
- `7154288` - "Fix: Preserve numbers in TTS + improve OAuth error logging" - Added retry logic

**KEY INSIGHT**: We reverted CSP to match `410f389`, but the ACTUAL working deployment is `4787f313`, which has different CSP!

---

## 🚨 CRITICAL FINDING

**The working deployment (`4787f313`) is AFTER the OAuth fix commit (`410f389`), and it has:**
- `ws://localhost:* wss://localhost:*` in CSP (which we removed!)
- MediaPipe scripts (which we removed, but probably not related to OAuth)

**We need to match `4787f313`, NOT `410f389`!**

---

## 🔍 ADDITIONAL AUDIT FINDINGS

### 5. **package.json - Dependencies**

#### ✅ WORKING DEPLOYMENT (4787f313):
- **Has MediaPipe npm packages:**
  - `@mediapipe/camera_utils`
  - `@mediapipe/drawing_utils`
  - `@mediapipe/face_mesh`
- **Total file size:** 347 lines

#### ❌ CURRENT CODE:
- **MediaPipe packages removed** (moved to CDN only)
- **Total file size:** 394 lines (+47 lines of retry logic/logging)

**DIFFERENCE**: 
- **Working**: Has MediaPipe as npm dependencies + CDN scripts
- **Current**: MediaPipe only via CDN (removed from npm)

**IMPACT**: Should not affect OAuth, but confirms MediaPipe was removed entirely from npm dependencies.

---

### 6. **netlify.toml - Configuration**

#### ✅ WORKING DEPLOYMENT (4787f313):
```toml
X-Frame-Options = "DENY"
```

#### ❌ CURRENT CODE:
```toml
X-Frame-Options = "DENY"
```

**DIFFERENCE**: 
- **Same in both** - This is actually a potential issue!
- `X-Frame-Options: DENY` blocks ALL iframes, which could interfere with OAuth popups

**IMPACT**: 
- ⚠️ **CRITICAL**: This header blocks iframes, which OAuth popups might use
- However, since it's the same in both working and current, it might not be the issue
- OR: The working deployment might have had this overridden somehow

**INVESTIGATION NEEDED**: Check if `X-Frame-Options: DENY` was present during the working deployment, or if there's a way to allow OAuth iframes specifically.

---

### 7. **googleCalendarService.js - Code Size & Complexity**

#### ✅ WORKING DEPLOYMENT (4787f313):
- **Lines of code:** 347
- **`initializeGis()`:** Simple immediate check (~20 lines)
- **`signIn()`:** Simple request, no try-catch (~15 lines)

#### ❌ CURRENT CODE:
- **Lines of code:** 394 (+47 lines)
- **`initializeGis()`:** Complex retry logic (~60 lines)
- **`signIn()`:** Wrapped in try-catch with extra logging (~25 lines)

**DIFFERENCE**: 
- **Working**: Lean, simple, fast-fail logic
- **Current**: More robust error handling but potentially masking issues

**IMPACT**: 
- The retry logic might hide real CSP blocking issues
- Extra logging is helpful for debugging but shouldn't affect functionality
- **However**: If CSP blocks script loading, retry will just delay failure by 5 seconds

---

### 8. **Script Loading Order**

#### ✅ WORKING DEPLOYMENT (4787f313):
```html
<!-- NEW Google Identity Services library -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
<!-- Google API for Calendar API calls -->
<script src="https://apis.google.com/js/api.js"></script>
<!-- MediaPipe scripts -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
```

#### ❌ CURRENT CODE:
```html
<!-- NEW Google Identity Services library -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
<!-- Google API for Calendar API calls -->
<script src="https://apis.google.com/js/api.js"></script>
<!-- MediaPipe scripts REMOVED -->
```

**DIFFERENCE**: 
- **Working**: GSI script loads first, then gapi, then MediaPipe
- **Current**: GSI script loads first, then gapi (MediaPipe removed)

**IMPACT**: Should not affect OAuth - script order is the same for OAuth-related scripts.

---

### 9. **CSP Comment Text**

#### ✅ WORKING DEPLOYMENT (4787f313):
```html
<!-- Content Security Policy to allow Google APIs -->
```

#### ❌ CURRENT CODE:
```html
<!-- Content Security Policy to allow Google APIs (matching working OAuth commit 410f389) -->
```

**DIFFERENCE**: 
- **Working**: Generic comment
- **Current**: References wrong commit (410f389 instead of 4787f313)

**IMPACT**: Just a comment, but shows we were targeting the wrong commit!

---

## 🎯 COMPREHENSIVE ROOT CAUSE ANALYSIS

### **Primary Issue: CSP Missing `ws://localhost:* wss://localhost:*`**

**Evidence:**
1. Working deployment (`4787f313`) has `ws://localhost:* wss://localhost:*` in CSP
2. Current code removed this (reverted to `410f389`)
3. `410f389` is BEFORE `4787f313` (the actual working deployment)

**Why this matters:**
- OAuth might use WebSocket connections for popup communication
- Google Identity Services might need `ws://` protocol support
- Even though `wss:` is allowed, `ws://localhost:*` might be required for redirect handling or popup iframe communication

### **Secondary Issue: Wrong Commit Reference**

**Evidence:**
- We reverted CSP to match `410f389` (first OAuth fix)
- But the actual working deployment is `4787f313` (MediaPipe fix, AFTER OAuth fix)
- `4787f313` includes the OAuth fix PLUS additional CSP changes

### **Tertiary Issue: X-Frame-Options Header**

**Evidence:**
- Both deployments have `X-Frame-Options: DENY` in `netlify.toml`
- This blocks ALL iframes, which OAuth popups might use
- **However**: If it's the same in both, it might not be the issue
- **OR**: Working deployment might have had this overridden or OAuth uses popup windows instead of iframes

---

## 📊 SUMMARY OF ALL DIFFERENCES

| File | Working (4787f313) | Current | Impact |
|------|-------------------|---------|--------|
| `index.html` CSP `connect-src` | Has `ws://localhost:* wss://localhost:*` | Missing | 🔴 **CRITICAL - Likely Root Cause** |
| `index.html` MediaPipe scripts | Present (CDN) | Removed | 🟡 **Medium - Affects tracking** |
| `googleCalendarService.js` `initializeGis()` | Simple immediate check | Retry logic + logging | 🟡 **Medium - Might mask issues** |
| `googleCalendarService.js` `signIn()` | Simple request | Try-catch + logging | 🟢 **Low - Better error handling** |
| `package.json` MediaPipe deps | Present | Removed | 🟡 **Medium - Affects tracking** |
| `netlify.toml` X-Frame-Options | `DENY` | `DENY` | 🟡 **Medium - Same in both, might not be issue** |
| CSP comment | Generic | References wrong commit | 🟢 **Low - Just documentation** |

---

## ✅ FINAL RECOMMENDATIONS

### **Priority 1: Restore CSP to Match Working Deployment (4787f313)**

**Action Required:**
1. Add `ws://localhost:* wss://localhost:*` back to CSP `connect-src` in `index.html`
2. This matches the exact working deployment that has OAuth working

**Why:**
- This is the only structural difference in CSP between working and current
- OAuth requires this for popup/iframe communication

### **Priority 2: Consider Simplifying `initializeGis()` (Optional)**

**Action Required:**
1. Option A: Keep retry logic but ensure CSP is correct first
2. Option B: Revert to simple immediate check to match working deployment exactly

**Why:**
- Working deployment uses simple logic that fails fast
- Current retry logic might mask CSP issues

### **Priority 3: Investigate X-Frame-Options (If CSP fix doesn't work)**

**Action Required:**
1. Check if `X-Frame-Options: DENY` was actually enforced during working deployment
2. Consider changing to `X-Frame-Options: SAMEORIGIN` to allow OAuth iframes
3. Or add exception for OAuth domains

**Why:**
- This header blocks iframes, which OAuth might use
- But since it's same in both, might not be the issue

---

## 🔢 FILE STATISTICS

- **Working deployment `googleCalendarService.js`:** 347 lines
- **Current `googleCalendarService.js`:** 394 lines (+47 lines = retry logic + logging)
- **Files changed since working deployment:** 3 files
  - `index.html`: 13 lines changed
  - `aishaPersonalityRules.js`: 7 lines changed
  - `googleCalendarService.js`: 107 lines changed

---

## 🚨 CRITICAL ACTION REQUIRED

**Restore `ws://localhost:* wss://localhost:*` to CSP `connect-src` in `index.html` to match the working deployment (`4787f313`), not `410f389`!**

