# 🗣️ Multi-Framework Lipsync Demo

A comprehensive demonstration of real-time lip synchronization using the [Wawa Lipsync](https://github.com/wass08/wawa-lipsync) library with multiple rendering frameworks.

## ✨ Features

- **🎮 Multi-Framework Support**: Three.js, Babylon.js, and 2D Canvas renderers
- **🎵 Real-time Audio Analysis**: Live processing with Web Audio API
- **🗣️ Viseme Detection**: 15 different mouth shapes based on Oculus LipSync standard
- **🎤 Multiple Audio Sources**: File upload, microphone input, sample audio files
- **📊 Visual Feedback**: Real-time frequency visualization and audio features
- **🔄 Hot-Swappable Renderers**: Switch between frameworks without restarting
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd multi-framework-lipsync-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

The demo will be available at `http://localhost:3000`

## 🎯 How It Works

### Core Architecture

```
┌─────────────────────────────────────────────┐
│                   App UI                    │
├─────────────────────────────────────────────┤
│              LipsyncManager                 │
│        (Framework-Agnostic Core)           │
├─────────────────────────────────────────────┤
│           Wawa Lipsync Library             │
│         (Audio Processing Core)            │
├─────────────────────────────────────────────┤
│               Web Audio API                │
│      (Browser Audio Processing)           │
└─────────────────────────────────────────────┘
```

### Audio Processing Pipeline

1. **Audio Input** → File, Microphone, or Sample
2. **Frequency Analysis** → 7 frequency bands (50Hz - 8kHz)
3. **Feature Extraction** → Volume, Centroid, Delta Bands
4. **Viseme Detection** → AI-powered mouth shape classification
5. **Animation** → Real-time character mouth movement

### Supported Visemes

The demo detects 15 visemes based on the Oculus LipSync standard:

| Viseme | Description | Sounds |
|--------|-------------|--------|
| `sil` | Silence | Quiet |
| `PP` | Lips pressed | P, B, M |
| `FF` | Lower lip to teeth | F, V |
| `TH` | Tongue between teeth | Th |
| `DD` | Tongue to roof | D, T, N, L |
| `kk` | Tongue to back | K, G |
| `CH` | Tongue raised | Ch, J, Sh |
| `SS` | Tongue groove | S, Z |
| `nn` | Mouth closed | N, M |
| `RR` | Tongue curl | R |
| `aa` | Wide open | Ah |
| `E` | Medium wide | Eh |
| `I` | Narrow | Ee |
| `O` | Round | Oh |
| `U` | Pursed lips | Oo |

## 🎮 Renderers

### Three.js Renderer
- **Technology**: WebGL with Three.js
- **Features**: 3D character, lighting, smooth animations
- **Performance**: High performance, hardware accelerated
- **Use Cases**: Games, VR/AR applications, 3D avatars

### Babylon.js Renderer  
- **Technology**: WebGL with Babylon.js engine
- **Features**: Advanced materials, animation system
- **Performance**: Excellent for complex 3D scenes
- **Use Cases**: Professional 3D applications, simulations

### 2D Canvas Renderer
- **Technology**: HTML5 Canvas 2D API
- **Features**: Lightweight, custom animations, debug info
- **Performance**: Lower resource usage
- **Use Cases**: Mobile apps, simple characters, debugging

## 🎵 Audio Sources

### File Upload
- **Supported Formats**: MP3, WAV, OGG, M4A
- **Usage**: Drag & drop or click to upload
- **Best For**: Testing with custom audio content

### Microphone Input
- **Real-time**: Live speech analysis
- **Requirements**: Microphone permissions
- **Best For**: Interactive applications, live demos

### Sample Audio Files
- **Vowels**: A, E, I, O, U sounds
- **Consonants**: P, B, T, D sounds  
- **Speech**: Full sentence examples
- **Best For**: Quick testing and demos

## 📊 Visualization Features

### Frequency Bands Display
- **7 Frequency Bands**: Visual representation of audio spectrum
- **Color-coded**: Each band has unique color
- **Real-time**: Updates 60fps with audio

### Audio Features Panel
- **Volume**: Current audio volume (0-100%)
- **Spectral Centroid**: Frequency "center of mass"
- **Band Energies**: Individual frequency band levels
- **Playback Status**: Playing/Paused indicator

### Viseme Information
- **Current Viseme**: Large display of active mouth shape
- **Description**: Human-readable explanation
- **Real-time Updates**: Smooth transitions between states

## 🔧 Development

### Project Structure

```
src/
├── core/                 # Framework-agnostic logic
│   ├── LipsyncManager.ts # Main manager class
│   └── types.ts         # TypeScript interfaces
├── renderers/           # Framework-specific implementations
│   ├── threejs/         # Three.js renderer
│   ├── babylonjs/       # Babylon.js renderer
│   └── canvas2d/        # 2D Canvas renderer
├── ui/                  # React UI components
│   ├── App.tsx          # Main application
│   ├── AudioControls.tsx # Audio input controls
│   ├── RendererSwitcher.tsx # Framework selector
│   ├── VisualizerPanel.tsx # Audio visualization
│   └── InfoPanel.tsx    # Information display
└── assets/              # Audio files, models, textures
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Quality Assurance  
npm run type-check   # TypeScript type checking
npm run lint         # Code linting (if configured)
```

### Adding New Renderers

1. **Create Renderer Class**:
```typescript
export class CustomRenderer implements LipsyncRenderer {
  public readonly id = 'custom';
  public readonly name = 'Custom Renderer';
  
  async init(container: HTMLElement): Promise<void> {
    // Initialize your renderer
  }
  
  updateViseme(viseme: VISEMES, features: LipsyncFeatures): void {
    // Update character animation
  }
  
  // ... implement other methods
}
```

2. **Register in App**:
```typescript
const rendererMap = {
  // ... existing renderers
  [RendererType.CUSTOM]: CustomRenderer,
};
```

3. **Add to Switcher UI**:
```typescript
const rendererInfo = {
  // ... existing renderers
  [RendererType.CUSTOM]: {
    name: 'Custom',
    description: 'Your custom renderer',
    icon: '🎨',
    features: ['Feature1', 'Feature2']
  }
};
```

## 🎨 Customization

### Styling
- **CSS Variables**: Modify colors and spacing in `App.css`
- **Theme Support**: Easy to add dark/light theme switching
- **Responsive**: Mobile-first design with breakpoints

### Audio Processing
- **FFT Size**: Adjust frequency resolution in `LipsyncManager`
- **History Size**: Change smoothing buffer size
- **Frequency Bands**: Modify band ranges for different analysis

### Animation
- **Smoothing**: Adjust lerp factors for different feel
- **Viseme Mapping**: Customize mouth shapes and transitions
- **Character Models**: Replace with your own 3D models

## 🔬 Technical Details

### Performance Optimization
- **RequestAnimationFrame**: Smooth 60fps animations
- **Efficient Rendering**: Only update when needed
- **Memory Management**: Proper cleanup and disposal
- **Audio Context**: Shared Web Audio API context

### Browser Compatibility
- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **WebGL Support**: Required for 3D renderers
- **Web Audio API**: Required for audio analysis
- **Microphone**: Requires HTTPS for getUserMedia

### Known Limitations
- **Audio Format Support**: Depends on browser codec support
- **Microphone Latency**: ~20-50ms typical latency
- **Memory Usage**: Increases with longer audio files
- **Mobile Performance**: 2D Canvas recommended for mobile

## 📚 Resources

### Documentation
- [Wawa Lipsync Library](https://github.com/wass08/wawa-lipsync)
- [Three.js Documentation](https://threejs.org/docs/)
- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [Web Audio API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Learning Resources
- [Real-time Lipsync Tutorial](https://youtu.be/GXU1amqvJF8) (Video)
- [Three.js & React Three Fiber Course](https://lessons.wawasensei.dev/courses/react-three-fiber/)
- [Oculus LipSync Documentation](https://developers.meta.com/horizon/documentation/unity/audio-ovrlipsync-viseme-reference/)

## 🤝 Contributing

Contributions are welcome! Please feel free to:

1. **Report Issues**: Bug reports and feature requests
2. **Submit PRs**: Code improvements and new features  
3. **Improve Docs**: Documentation and examples
4. **Add Renderers**: New framework integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Wawa Sensei** - Creator of the Wawa Lipsync library
- **Three.js Team** - Amazing 3D library
- **Babylon.js Team** - Powerful 3D engine
- **React Team** - Fantastic UI library
- **Vite Team** - Lightning-fast build tool

---

**Made with ❤️ and lots of ☕**

For questions or support, please [open an issue](https://github.com/your-repo/issues) or join our [Discord community](https://wawasensei.dev/discord).



