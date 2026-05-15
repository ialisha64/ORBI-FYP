import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/assistant_model.dart';
import '../models/message_model.dart';
import '../config/api_config.dart';

class AIService {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;
  AIService._internal();

  String? _cachedToken;

  static const String _tokenKey = 'access_token';

  Future<String?> _getToken() async {
    if (_cachedToken != null) return _cachedToken;

    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey); // ✅ FIXED
    return _cachedToken;
  }

  void setToken(String token) {
    _cachedToken = token;
  }

  void clearToken() {
    _cachedToken = null;
  }

  Future<Map<String, String>> _headers() async {
    final token = await _getToken();
    if (token != null) {
      return ApiConfig.authHeaders(token);
    }
    return ApiConfig.jsonHeaders;
  }

  // ================= CHAT =================

  Future<String> sendMessage({
    required String userMessage,
    required AssistantModel assistant,
    List<Message>? conversationHistory,
    String? sessionId,
  }) async {
    try {
      final headers = await _headers();

      final body = {
        'message': userMessage,
        if (sessionId != null) 'session_id': sessionId,
      };

      final response = await http.post(
        Uri.parse(ApiConfig.chatUrl),
        headers: headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['reply'] ?? "No response";
      } else {
        throw Exception("API Error: ${response.statusCode}");
      }
    } catch (e) {
      print("ERROR: $e");
      return "Server error. Please try again.";
    }
  }

  // ================= STREAM =================

  Stream<String> sendMessageStream({
    required String userMessage,
    required AssistantModel assistant,
    List<Message>? conversationHistory,
    String? sessionId,
  }) async* {
    try {
      final full = await sendMessage(
        userMessage: userMessage,
        assistant: assistant,
      );

      for (var word in full.split(" ")) {
        await Future.delayed(const Duration(milliseconds: 50));
        yield "$word ";
      }
    } catch (e) {
      yield "Error occurred";
    }
  }

  // ================= AI ASK =================

  Future<String> askAnything(String question) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.aiAskUrl),
        headers: await _headers(),
        body: jsonEncode({'question': question}),
      );

      final data = jsonDecode(response.body);
      return data['answer'] ?? "No answer";
    } catch (e) {
      return "Error occurred";
    }
  }
}