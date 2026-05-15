import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../models/message_model.dart';
import '../models/assistant_model.dart';
import '../services/ai_service.dart';
import '../services/tts_service.dart';

enum ConversationState {
  idle,
  listening,
  thinking,
  speaking,
}

class ConversationProvider with ChangeNotifier {
  final AIService _aiService = AIService();
  final TtsService _ttsService = TtsService();
  final Uuid _uuid = const Uuid();

  ConversationState _state = ConversationState.idle;
  List<Message> _messages = [];
  bool _isLoading = false;
  String? _error;

  double _mouthOpenValue = 0.0;
  Timer? _voiceMouthTimer;
  final math.Random _random = math.Random();

  // CONSTANTS (moved here to avoid ApiConfig issues)
  static const int maxHistory = 20;
  static const String messageBoxKey = 'messages';

  // Getters
  ConversationState get state => _state;
  List<Message> get messages => _messages;
  bool get isLoading => _isLoading;
  String? get error => _error;
  double get mouthOpenValue => _mouthOpenValue;

  ConversationProvider();

  // Start conversation
  Future<void> startConversation(AssistantModel assistant) async {

    _messages = [];
    notifyListeners();

    await _addAssistantMessage(assistant.getRandomGreeting(), assistant);
  }

  // Send message
  Future<void> sendMessage(String content, AssistantModel assistant) async {
    if (content.trim().isEmpty) return;

    try {
      _isLoading = true;
      _setState(ConversationState.thinking);

      final userMessage = Message(
        id: _uuid.v4(),
        content: content,
        type: MessageType.text,
        sender: MessageSender.user,
        timestamp: DateTime.now(),
        assistantId: assistant.id,
      );

      _messages.add(userMessage);
      notifyListeners();

      final response = await _aiService.sendMessage(
        userMessage: content,
        assistant: assistant,
        conversationHistory: _getRecentMessages(),
      );

      await _addAssistantMessage(response, assistant);

      _setState(ConversationState.speaking);
      _startMouthAnimation();

      await _ttsService.speakWithAssistant(response, assistant);

      _stopMouthAnimation();
      _setState(ConversationState.idle);
    } catch (e) {
      _error = e.toString();
      debugPrint('Error: $e');
      _setState(ConversationState.idle);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Add assistant message
  Future<void> _addAssistantMessage(String content, AssistantModel assistant) async {
    final message = Message(
      id: _uuid.v4(),
      content: content,
      type: MessageType.text,
      sender: MessageSender.assistant,
      timestamp: DateTime.now(),
      assistantId: assistant.id,
    );

    _messages.add(message);
    notifyListeners();

    await _saveMessage(message);
  }

  // Recent messages
  List<Message> _getRecentMessages() {
    if (_messages.length <= maxHistory) return _messages;
    return _messages.sublist(_messages.length - maxHistory);
  }

  // Mouth animation
  void _startMouthAnimation() {
    _voiceMouthTimer?.cancel();
    _voiceMouthTimer = Timer.periodic(const Duration(milliseconds: 120), (_) {
      if (_state != ConversationState.speaking) return;
      _mouthOpenValue = 0.3 + _random.nextDouble() * 0.6;
      notifyListeners();
    });
  }

  void _stopMouthAnimation() {
    _voiceMouthTimer?.cancel();
    _mouthOpenValue = 0.0;
    notifyListeners();
  }

  void _setState(ConversationState state) {
    _state = state;
    notifyListeners();
  }

  // Save message
  Future<void> _saveMessage(Message message) async {
    try {
      final box = await Hive.openBox<Message>(messageBoxKey);
      await box.put(message.id, message);
    } catch (e) {
      debugPrint('Hive Save Error: $e');
    }
  }

  @override
  void dispose() {
    _stopMouthAnimation();
    _ttsService.dispose();
    super.dispose();
  }

  void setListening(bool bool) {}

  void sendMessageStream(String text, AssistantModel backendAssistant) {}

  void clearConversation() {}

  void stopSpeaking() {}
}