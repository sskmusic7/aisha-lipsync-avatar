# Aisha - LayerCode Integration

A standalone version of Aisha's frontend designed to integrate with LayerCode voice agents.

## 🚀 Features

- **3D Avatar**: Interactive Aisha avatar with speaking animations
- **LayerCode Integration**: Direct API connection to LayerCode agents
- **Real-time Chat**: Live conversation with your LayerCode agent
- **Responsive Design**: Works on desktop and mobile
- **Glass Morphism UI**: Modern, beautiful interface

## 📁 Files Included

- `index.html` - Complete standalone application
- `README.md` - This documentation
- `setup-guide.md` - Integration instructions

## 🔧 Setup Instructions

### 1. Basic Setup
1. Download the `index.html` file
2. Place it in your web server directory
3. Ensure you have the Aisha 3D model at `/models/wawalipavatar.glb`

### 2. LayerCode Integration
1. Get your LayerCode API key from your dashboard
2. Update the `baseUrl` in the LayerCodeService class if needed
3. Replace `'qhwfi36h'` with your actual agent ID

### 3. Customization
- **Avatar Model**: Replace `/models/wawalipavatar.glb` with your preferred model
- **Styling**: Modify the CSS in the `<style>` section
- **API Endpoints**: Update LayerCode API calls in the `LayerCodeService` class

## 🌐 Usage

1. Open `index.html` in a web browser
2. Enter your LayerCode API key
3. Click "Connect"
4. Start chatting with your LayerCode agent through Aisha!

## 🔗 LayerCode API Integration

The integration uses a simple service class that handles:
- API key authentication
- Message sending to LayerCode
- Response handling
- Error management

### Example API Call Structure:
```javascript
const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
        message: message,
        agent_id: 'your-agent-id'
    })
});
```

## 🎨 Customization Options

### Avatar Customization
- Replace the GLTF model path
- Modify animation parameters
- Adjust lighting and camera angles

### UI Customization
- Change color scheme in CSS variables
- Modify glass effect styling
- Adjust responsive breakpoints

### LayerCode Integration
- Update API endpoints
- Add additional request parameters
- Implement custom response handling

## 📱 Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## 🚨 Requirements

- Web server (for loading 3D models)
- LayerCode API key
- Modern browser with WebGL support

## 📞 Support

For integration help or customization requests, contact your development team.

---

**Ready to integrate Aisha with your LayerCode agent!** 🎉
