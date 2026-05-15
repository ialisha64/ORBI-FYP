# 🚀 ORBI Setup Guide - Step by Step

Complete setup instructions for the 3D Virtual Assistant System

## ✅ What's Already Done

Your project has been successfully initialized with:
- ✅ All dependencies configured in pubspec.yaml
- ✅ Project structure created (models, services, providers, screens, widgets)
- ✅ Three assistant personalities implemented (Marcus, Aria, Alex)
- ✅ Voice input/output services configured
- ✅ AI service layer ready for Claude API
- ✅ Beautiful UI with dark/light themes
- ✅ Hive adapters generated for local storage

## 📝 Next Steps to Complete Setup

### Step 1: Get Your Claude API Key (Required)

1. **Visit Anthropic Console**
   - Go to: https://console.anthropic.com/

2. **Create Account / Sign In**
   - Use your email to create an account
   - Verify your email address

3. **Generate API Key**
   - Navigate to "API Keys" section
   - Click "Create Key"
   - Give it a name (e.g., "ORBI Assistant")
   - **Copy the key immediately** (you won't see it again!)

4. **Add Credits (if needed)**
   - Anthropic provides some free credits
   - Add payment method if you need more

### Step 2: Configure API Key in Your Project

1. Open `lib/config/api_config.dart`

2. Replace the placeholder with your actual key:

```dart
class ApiConfig {
  // Replace this line:
  static const String claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';

  // With your actual key:
  static const String claudeApiKey = 'sk-ant-api03-xxxxxxxxxxxxx';
}
```

3. Save the file

⚠️ **IMPORTANT**: Never commit your API key to GitHub! Add `lib/config/api_config.dart` to `.gitignore`

### Step 3: Add Microphone Permissions

#### For Android:

1. Open `android/app/src/main/AndroidManifest.xml`

2. Add these permissions inside the `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

#### For iOS:

1. Open `ios/Runner/Info.plist`

2. Add these entries inside the `<dict>` tag:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for voice commands</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>We need speech recognition for voice input</string>
```

### Step 4: Download 3D Models (Optional but Recommended)

#### Where to Get 3D Models:

**Option 1: Ready Player Me (Easiest)**
1. Visit: https://readyplayer.me/
2. Click "Create Avatar"
3. Customize your avatar
4. Download as GLB format
5. Create 3 different avatars (male professional, female creative, neutral)

**Option 2: Mixamo (More Options)**
1. Visit: https://www.mixamo.com/
2. Sign in with Adobe ID
3. Browse Characters
4. Select a character
5. Download as FBX, then convert to GLB using:
   - https://products.aspose.app/3d/conversion/fbx-to-glb

**Option 3: Sketchfab (Free Models)**
1. Visit: https://sketchfab.com/
2. Search for "human character rigged"
3. Filter by "Downloadable" and "Free"
4. Download models in GLB format

#### Naming Your Models:

Rename downloaded models to:
```
assets/models/assistant_1_male_professional.glb
assets/models/assistant_2_female_creative.glb
assets/models/assistant_3_neutral_organizer.glb
```

#### Model Guidelines:
- Format: GLB (preferred) or GLTF
- Size: Keep under 10MB each
- Rigged: Yes (for future animations)
- Texture: Embedded in GLB file

### Step 5: Run the Project

1. **Connect your device or start emulator**

```bash
flutter devices
```

2. **Run the app**

```bash
flutter run
```

3. **Or run in release mode** (better performance)

```bash
flutter run --release
```

### Step 6: Test the Features

#### Test Voice Input:
1. Select any assistant (Marcus, Aria, or Alex)
2. Tap the microphone button
3. Say "Hello" or "Tell me a joke"
4. The app should recognize your speech

#### Test AI Response:
1. Type a message: "What can you help me with?"
2. Send it
3. You should get a response from Claude AI
4. The assistant will speak the response

#### Test Text-to-Speech:
1. Send any message
2. Listen to the assistant's voice response
3. Each assistant has different voice settings

## 🛠️ Troubleshooting

### Problem: API Key Error

**Solution:**
1. Check `lib/config/api_config.dart` has your real API key
2. Verify the key starts with `sk-ant-api03-`
3. Check you have credits in Anthropic console
4. Make sure you have internet connection

### Problem: Microphone Not Working

**Solution:**
1. Check permissions are added to AndroidManifest.xml / Info.plist
2. Go to device Settings → Apps → ORBI → Permissions
3. Enable Microphone permission manually
4. Restart the app

### Problem: "Hive Box Already Open" Error

**Solution:**
```bash
flutter clean
flutter pub get
flutter run
```

Or clear app data from device settings.

### Problem: 3D Models Not Showing

**Solution:**
1. The app uses placeholders by default (circular avatars with initials)
2. To use real 3D models, integrate `model_viewer_plus` widget
3. See `lib/widgets/model_3d_viewer.dart` for integration notes

### Problem: Build Errors

**Solution:**
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
flutter run
```

## 📱 Platform-Specific Notes

### Android:
- Min SDK: 21 (Android 5.0)
- Target SDK: 34 (Android 14)
- Works on physical devices and emulators

### iOS:
- Min iOS: 12.0
- Requires Xcode 14+
- Test on simulators or real devices

### Windows/Mac/Linux:
- Limited support (no mobile features)
- Voice input may not work
- Good for testing UI only

## 🎯 Recommended Testing Flow

1. ✅ Launch app → See splash screen
2. ✅ See home screen with 3 assistants
3. ✅ Tap "Marcus" → Opens chat screen
4. ✅ Type "Hello" → Get AI response
5. ✅ Tap microphone → Speak "Tell me a joke"
6. ✅ Get voice + text response
7. ✅ Ask "Create a task to call mom tomorrow"
8. ✅ Toggle dark mode from home screen
9. ✅ Try all 3 assistants

## 📈 Performance Tips

### Optimize for Production:

1. **Build release APK:**
```bash
flutter build apk --release
```

2. **Build app bundle (for Play Store):**
```bash
flutter build appbundle
```

3. **Reduce app size:**
- Use ProGuard/R8 (enabled by default)
- Compress 3D models
- Optimize images

### Optimize 3D Models:

Use glTF-Transform to compress models:
```bash
npm install -g @gltf-transform/cli
gltf-transform optimize input.glb output.glb --texture-compress webp
```

## 🔐 Security Best Practices

1. **Never commit API keys**
   - Add to `.gitignore`:
   ```
   lib/config/api_config.dart
   ```

2. **Use environment variables** (Production):
   - Create `api_config.dart` from template
   - Load keys from secure storage

3. **Enable ProGuard** (Android):
   - Already enabled in `build.gradle`

## 🎓 Learning Resources

### Flutter Documentation:
- https://docs.flutter.dev/

### Provider State Management:
- https://pub.dev/packages/provider

### Claude AI API:
- https://docs.anthropic.com/claude/reference/getting-started-with-the-api

### Speech Recognition:
- https://pub.dev/packages/speech_to_text

### 3D Models:
- https://pub.dev/packages/model_viewer_plus

## 🚀 What's Next?

After basic setup works:

### Phase 1: Core Features (Current)
- [x] 3D placeholder avatars
- [x] Voice input/output
- [x] AI conversations
- [x] Basic UI

### Phase 2: Enhanced Features
- [ ] Real 3D model integration
- [ ] Lip-sync animations
- [ ] Task management UI
- [ ] Conversation history view

### Phase 3: Advanced Features
- [ ] Wake word detection
- [ ] Multi-language support
- [ ] Email integration
- [ ] Calendar sync
- [ ] Gesture controls

## 💡 Tips for Development

1. **Hot Reload**: Press `r` in terminal while app runs
2. **Hot Restart**: Press `R` for full restart
3. **Debug Mode**: Use `flutter run` for debugging
4. **Release Mode**: Use `flutter run --release` for performance testing

## 📞 Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review code comments in files
3. Check Flutter documentation
4. Verify API key and permissions
5. Try `flutter clean && flutter pub get`

## ✨ You're All Set!

Your 3D Virtual Assistant is ready to use! Start by:

1. ✅ Adding your Claude API key
2. ✅ Running `flutter run`
3. ✅ Selecting an assistant
4. ✅ Having a conversation!

Enjoy your intelligent 3D virtual assistant! 🎉

---

**Project:** 3D Human-Like Virtual Assistant System
**Framework:** Flutter
**AI:** Claude (Anthropic)
**Status:** Ready for Development & Testing
