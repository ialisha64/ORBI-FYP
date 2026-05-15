# 🔑 API Configuration Instructions

## Current Issue: "Technical Difficulties" Error

The error message **"I apologize, but I'm currently experiencing technical difficulties"** appears because **your Claude API key is not configured yet**.

---

## ✅ SOLUTION: Configure Your Claude API Key

### Step 1: Get Your API Key

1. **Visit Anthropic Console**
   - Go to: https://console.anthropic.com/

2. **Sign Up / Log In**
   - Create an account with your email
   - Verify your email address

3. **Generate API Key**
   - Click on **"API Keys"** in the sidebar
   - Click **"Create Key"**
   - Give it a name: `ORBI Assistant`
   - **COPY THE KEY IMMEDIATELY** (shown only once!)
   - It will look like: `sk-ant-api03-xxxxxxxxxxxxx`

4. **Add Credits** (If Needed)
   - Anthropic provides $5 free credits for new accounts
   - Add payment method if you need more

---

### Step 2: Add API Key to Your Project

**Option A: Direct Configuration (Quick)**

1. Open the file:
   ```
   orbi_flutter_app/lib/config/api_config.dart
   ```

2. Find this line (around line 4):
   ```dart
   static const String claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';
   ```

3. Replace it with your actual key:
   ```dart
   static const String claudeApiKey = 'sk-ant-api03-xxxxxxxxxxxxx';
   ```

4. Save the file

5. **IMPORTANT**: Add to `.gitignore` to avoid committing your key:
   ```
   lib/config/api_config.dart
   ```

---

**Option B: Environment Variables (Recommended for Production)**

1. Create a new file: `lib/config/api_config_template.dart`
   ```dart
   class ApiConfig {
     static const String claudeApiKey = String.fromEnvironment(
       'CLAUDE_API_KEY',
       defaultValue: 'YOUR_CLAUDE_API_KEY_HERE',
     );
     // ... rest of the config
   }
   ```

2. Run with environment variable:
   ```bash
   flutter run --dart-define=CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
   ```

---

### Step 3: Test the API

1. **Restart your app**
   ```bash
   flutter run
   ```

2. **Send a test message**
   - Select any assistant
   - Type: "Hello"
   - You should get a response from Claude AI

---

## 🎯 Alternative: Use Demo Mode (No API Key Needed)

If you don't have an API key yet, you can enable demo mode with simulated responses:

### Enable Demo Mode:

1. Open: `lib/config/api_config.dart`

2. Add this constant at the top:
   ```dart
   class ApiConfig {
     static const bool demoMode = true; // Enable demo mode

     static const String claudeApiKey = 'YOUR_CLAUDE_API_KEY_HERE';
     // ... rest
   }
   ```

3. Open: `lib/services/ai_service.dart`

4. Update the `sendMessage` method to check for demo mode:
   ```dart
   Future<String> sendMessage({
     required String userMessage,
     required AssistantModel assistant,
     List<Message>? conversationHistory,
   }) async {
     // Check for demo mode
     if (ApiConfig.demoMode) {
       await Future.delayed(const Duration(seconds: 1));
       return _getDemoResponse(userMessage, assistant);
     }

     // ... rest of the method
   }
   ```

5. Add the demo response method:
   ```dart
   String _getDemoResponse(String message, AssistantModel assistant) {
     final responses = {
       AssistantType.marcus: [
         "I understand. Let me help you with that professionally.",
         "Excellent point. I'll assist you with organizing this task.",
         "Based on your request, here's what I recommend...",
       ],
       AssistantType.aria: [
         "That's an exciting idea! Let's explore it creatively!",
         "I love where you're going with this! Here are some thoughts...",
         "Ooh, that sparks some great creative possibilities!",
       ],
       AssistantType.alex: [
         "Let's approach this mindfully and create a balanced plan.",
         "Great! I'll help you organize this in a healthy way.",
         "Remember to take breaks. Here's how we can tackle this...",
       ],
     };

     final list = responses[assistant.type]!;
     list.shuffle();
     return list.first;
   }
   ```

---

## 🐛 Troubleshooting

### Error: "API key not configured"
- **Solution**: Make sure you've added your API key to `api_config.dart`
- Check that the key starts with `sk-ant-api03-`

### Error: "401 Unauthorized"
- **Solution**: Your API key is invalid or expired
- Generate a new key from Anthropic console

### Error: "429 Too Many Requests"
- **Solution**: You've hit the rate limit
- Wait a few minutes and try again
- Consider upgrading your Anthropic plan

### Error: "Insufficient credits"
- **Solution**: Add credits to your Anthropic account
- Go to: https://console.anthropic.com/settings/billing

### Still getting "Technical difficulties"?
1. Check your internet connection
2. Verify the API key is correct (no extra spaces)
3. Check Anthropic console for any service outages
4. Try the demo mode as a fallback

---

## 💰 Pricing Information

**Anthropic Claude Pricing (as of 2024):**
- **Free Tier**: $5 in free credits for new accounts
- **Claude 3.5 Sonnet**:
  - Input: $3 per million tokens
  - Output: $15 per million tokens
- **Estimated costs for ORBI**:
  - ~100 messages = $0.50 - $1.00
  - Very affordable for development and testing!

---

## 🔐 Security Best Practices

1. **Never commit API keys to GitHub**
   - Add `lib/config/api_config.dart` to `.gitignore`

2. **Use environment variables in production**
   - Load keys from secure storage
   - Use Flutter's `--dart-define` feature

3. **Rotate keys regularly**
   - Generate new keys every few months
   - Revoke old keys from Anthropic console

4. **Monitor usage**
   - Check Anthropic console for API usage
   - Set up billing alerts

---

## ✅ Quick Start Checklist

- [ ] Create Anthropic account
- [ ] Generate API key
- [ ] Copy API key to `api_config.dart`
- [ ] Add `api_config.dart` to `.gitignore`
- [ ] Restart the app
- [ ] Test with a message
- [ ] Verify AI response works

---

## 🎉 Success!

Once configured, you should see:
- AI responds to your messages
- No more "technical difficulties" errors
- Each assistant has unique personality
- Conversations are context-aware

**Need help?** Check the main README.md or SETUP_GUIDE.md

---

**Note**: The 3D models will now load using online Ready Player Me avatars as demonstration. To use your own models, follow the instructions in the README.md file.
