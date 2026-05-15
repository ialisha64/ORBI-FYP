# ORBI - 3D Human-Like Virtual Assistant System

A comprehensive Flutter-based 3D virtual assistant application featuring three unique AI personalities with voice interaction and intelligent task management.

## 🌟 Features

### Three Unique Virtual Assistants

1. **Marcus - The Professional**
   - Business-oriented assistant for productivity
   - Specialties: Email management, meetings, research, reports
   - Voice: Deep, formal, authoritative

2. **Aria - The Creative**
   - Creative companion for brainstorming and content creation
   - Specialties: Content writing, ideas, social media, learning
   - Voice: Bright, energetic, inspiring

3. **Alex - The Organizer**
   - Wellness-focused assistant for work-life balance
   - Specialties: Task management, habits, wellness, goals
   - Voice: Calm, supportive, balanced

### Core Capabilities

- ✅ **3D Avatar Display** - Interactive 3D character models (placeholder ready for GLB/GLTF)
- ✅ **Voice Input** - Speech-to-text with real-time recognition
- ✅ **AI Conversations** - Claude AI integration for intelligent responses
- ✅ **Text-to-Speech** - Natural voice output with personality-based voices
- ✅ **Task Management** - Create, track, and complete tasks
- ✅ **Animation States** - Idle, Listening, Thinking, Speaking animations
- ✅ **Dark/Light Themes** - Beautiful glassmorphism UI design
- ✅ **Conversation History** - Persistent chat storage with Hive

## 📋 Prerequisites

- Flutter SDK >= 3.0.0
- Dart SDK >= 3.0.0
- Android Studio / VS Code with Flutter plugin
- Claude API Key (from Anthropic) OR OpenAI API Key

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd orbi_flutter_app
```

### 2. Install dependencies

```bash
flutter pub get
```

### 3. Generate Hive adapters

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### 4. Configure API Keys

Edit `lib/config/api_config.dart` and add your API key:

```dart
class ApiConfig {
  static const String claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';
  // OR
  static const String openaiApiKey = 'YOUR_OPENAI_API_KEY_HERE';
}
```

**Get Claude API Key:**
1. Visit https://console.anthropic.com/
2. Sign up / Log in
3. Go to API Keys section
4. Create a new API key
5. Copy and paste in `api_config.dart`

### 5. Add 3D Models (Optional - Enhanced Experience)

Download 3D character models and place them in `assets/models/`:

**Recommended Sources:**
- Ready Player Me: https://readyplayer.me/ (Free avatars)
- Mixamo: https://www.mixamo.com/ (Free rigged characters)
- Sketchfab: https://sketchfab.com/ (Download GLB/GLTF models)

**Required files:**
```
assets/models/
├── assistant_1_male_professional.glb
├── assistant_2_female_creative.glb
└── assistant_3_neutral_organizer.glb
```

**Model Requirements:**
- Format: GLB or GLTF
- Size: < 10MB per model (optimized)
- Rigged: Yes (for animations)
- Animations: Idle, Talking, Listening (optional)

### 6. Run the app

```bash
flutter run
```

## 🏗️ Project Structure

```
lib/
├── config/               # Configuration files
│   ├── api_config.dart   # API keys and settings
│   ├── theme_config.dart # App themes and styles
│   └── constants.dart    # App constants
│
├── models/               # Data models
│   ├── assistant_model.dart      # 3 assistant personalities
│   ├── message_model.dart        # Chat messages
│   ├── task_model.dart          # Task management
│   └── conversation_context.dart
│
├── services/             # Business logic services
│   ├── ai_service.dart          # Claude AI integration
│   ├── speech_service.dart      # Speech-to-text
│   └── tts_service.dart         # Text-to-speech
│
├── providers/            # State management
│   ├── assistant_provider.dart
│   ├── conversation_provider.dart
│   └── theme_provider.dart
│
├── screens/              # UI screens
│   ├── splash_screen.dart
│   ├── home_screen.dart         # Assistant selection
│   └── chat_screen.dart         # Main conversation
│
├── widgets/              # Reusable widgets
│   ├── message_bubble.dart
│   ├── voice_input_button.dart
│   └── model_3d_viewer.dart     # 3D model display
│
└── main.dart            # App entry point
```

## 🎨 Usage

### 1. Select Your Assistant

Launch the app and choose from three unique assistants based on your needs:
- **Marcus** for professional tasks
- **Aria** for creative work
- **Alex** for personal organization

### 2. Interact with Voice or Text

- **Type**: Use the text input to send messages
- **Speak**: Tap the microphone button and speak your query
- The assistant will respond with voice and text

### 3. Manage Tasks

Ask your assistant to:
```
"Create a task to finish the report by tomorrow"
"Remind me to call John at 3 PM"
"Show me my pending tasks"
```

### 4. Examples

**With Marcus:**
- "Schedule a meeting for next Monday at 2 PM"
- "Help me draft an email to my professor"
- "What are my deadlines this week?"

**With Aria:**
- "Give me ideas for a blog post about AI"
- "Help me brainstorm project names"
- "Write a creative introduction for my presentation"

**With Alex:**
- "Create a daily routine for better productivity"
- "Remind me to take breaks every hour"
- "Help me set wellness goals"

## 🔧 Configuration

### Changing Assistant Voices

Edit voice settings in `lib/models/assistant_model.dart`:

```dart
voiceSettings: VoiceSettings(
  gender: VoiceGender.male,
  pitch: 0.9,    // 0.5 to 2.0
  rate: 1.0,     // 0.5 to 2.0
  volume: 1.0,   // 0.0 to 1.0
)
```

### Customizing AI Behavior

Modify system prompts in `assistant_model.dart` -> `getSystemPrompt()` method.

### Theme Customization

Edit colors and styles in `lib/config/theme_config.dart`.

## 📱 Supported Platforms

- ✅ Android (tested)
- ✅ iOS (should work)
- ⚠️ Web (limited 3D model support)
- ⚠️ Desktop (experimental)

## 🐛 Troubleshooting

### Microphone Permission Denied
Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

For iOS, add to `Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for voice commands</string>
```

### API Key Errors
- Ensure API key is correctly set in `lib/config/api_config.dart`
- Check your API key is active and has credits
- Verify internet connection

### 3D Models Not Loading
- Check model file paths in `assets/models/`
- Ensure pubspec.yaml includes asset paths
- Run `flutter clean && flutter pub get`
- Verify model format is GLB or GLTF

### Hive Errors
- Run: `flutter pub run build_runner build --delete-conflicting-outputs`
- Delete Hive boxes: Clear app data and restart

## 🚧 Future Enhancements

### Phase 2 (Planned)
- [ ] Real 3D model integration with animations
- [ ] Lip-sync for realistic speech
- [ ] Facial expressions based on emotion
- [ ] Advanced task management with calendar
- [ ] Email composition and sending

### Phase 3 (Advanced)
- [ ] Wake word detection ("Hey Marcus")
- [ ] Multi-language support
- [ ] Calendar integration
- [ ] File management
- [ ] Smart notifications
- [ ] Gesture controls for 3D models

## 📄 License

This project is for educational purposes (Final Year Project).

## 👥 Credits

- Built with Flutter
- AI powered by Claude (Anthropic)
- Voice by flutter_tts and speech_to_text
- Icons from Flutter Material Design

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code documentation
3. Contact the developer

---

**Made with ❤️ for FYP - 3D Human-Like Virtual Assistant System**
