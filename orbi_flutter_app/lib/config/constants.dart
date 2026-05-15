class AppConstants {
  // App Info
  static const String appName = 'ORBI Assistant';
  static const String appVersion = '1.0.0';


static const String keySelectedAssistant = 'selected_assistant';


  // Animation States
  static const String animationIdle = 'idle';
  static const String animationListening = 'listening';
  static const String animationThinking = 'thinking';
  static const String animationSpeaking = 'speaking';

  // Wake Words
  static const List<String> wakeWords = [
    'Hey Marcus',
    'Hey Aria',
    'Hey Alex',
  ];

  // Language
  static const String defaultLanguage = 'en-US';

  // UI
  static const double padding = 16.0;
  static const double radius = 12.0;

  // Messages
  static const int maxMessageLength = 5000;

  // Errors
  static const String errorNoInternet =
      'No internet connection. Please check your network.';
  static const String errorGeneric =
      'Something went wrong. Please try again.';

  // Placeholders
  static const String placeholderMessage = 'Type your message...';

  // Storage
  static const String keyAccessToken = 'access_token';
  static const String keyRefreshToken = 'refresh_token';

  // Debug
  static const bool debugMode = true;

  static bool? get verboseLogs => null;

  static Duration? get listeningTimeout => null;

  static Duration? get speechTimeout => null;
}