# LayerCode Integration Setup Guide

## 🔧 Step-by-Step Integration

### 1. LayerCode API Setup

#### Get Your API Credentials
1. Go to your LayerCode dashboard
2. Navigate to API settings
3. Generate an API key
4. Note your agent ID (e.g., `qhwfi36h`)

#### Update the Integration
In `index.html`, find the `LayerCodeService` class and update:

```javascript
class LayerCodeService {
    constructor() {
        this.baseUrl = 'https://your-layercode-api-endpoint.com'; // Update this
        this.apiKey = null;
        this.isConnected = false;
    }
    
    async sendMessage(message) {
        // Update the API call structure based on LayerCode's actual API
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                message: message,
                agent_id: 'qhwfi36h' // Replace with your agent ID
            })
        });
    }
}
```

### 2. API Endpoint Configuration

#### Common LayerCode API Patterns
Choose the pattern that matches your LayerCode setup:

**Pattern 1: REST API**
```javascript
const response = await fetch(`${this.baseUrl}/api/v1/agents/${agentId}/chat`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
        message: message,
        user_id: 'user123' // Optional
    })
});
```

**Pattern 2: WebSocket**
```javascript
const ws = new WebSocket(`${this.baseUrl}/ws?token=${this.apiKey}`);
ws.send(JSON.stringify({
    type: 'message',
    agent_id: agentId,
    message: message
}));
```

**Pattern 3: Custom Endpoint**
```javascript
const response = await fetch(`${this.baseUrl}/custom-endpoint`, {
    method: 'POST',
    headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        agent: agentId,
        input: message,
        format: 'text'
    })
});
```

### 3. Response Handling

#### Standard Response Format
```javascript
const data = await response.json();
return data.response || data.message || data.text || 'No response received';
```

#### Error Handling
```javascript
if (!response.ok) {
    throw new Error(`LayerCode API error: ${response.status}`);
}

const data = await response.json();
if (data.error) {
    throw new Error(data.error);
}
```

### 4. Testing the Integration

#### Test Connection
1. Open browser console (F12)
2. Enter your API key
3. Click "Connect"
4. Look for success/error messages

#### Test Messaging
1. Send a test message
2. Check console for API calls
3. Verify responses are received

### 5. Customization Options

#### Avatar Model
Replace the model path:
```javascript
loader.load('/path/to/your/model.glb', (gltf) => {
    // Model loading logic
});
```

#### UI Styling
Modify CSS variables:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --glass-opacity: 0.1;
}
```

#### Animation Timing
Adjust speaking animation:
```javascript
setTimeout(() => setIsSpeaking(false), 2000); // Change duration
```

### 6. Deployment Options

#### Option 1: Static Hosting
- Upload to Netlify, Vercel, or GitHub Pages
- Ensure HTTPS for API calls
- Add CORS headers if needed

#### Option 2: Local Server
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

#### Option 3: Custom Server
Add CORS headers:
```javascript
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
```

### 7. Troubleshooting

#### Common Issues

**CORS Errors**
- Ensure your LayerCode API supports CORS
- Use a proxy server if needed
- Check browser console for specific errors

**API Key Issues**
- Verify the key format
- Check expiration date
- Ensure proper headers

**Model Loading Issues**
- Verify model path is correct
- Check file permissions
- Ensure WebGL is supported

**Connection Timeouts**
- Increase timeout values
- Check network connectivity
- Verify API endpoint is accessible

### 8. Advanced Features

#### Voice Integration
```javascript
// Add speech recognition
const recognition = new webkitSpeechRecognition();
recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    // Send to LayerCode
};
```

#### Real-time Updates
```javascript
// WebSocket for real-time responses
const ws = new WebSocket('wss://your-websocket-endpoint');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update UI with real-time data
};
```

#### Custom Animations
```javascript
// Trigger custom animations based on response
if (response.includes('happy')) {
    triggerHappyAnimation();
} else if (response.includes('sad')) {
    triggerSadAnimation();
}
```

---

**Your LayerCode integration is ready!** 🚀
