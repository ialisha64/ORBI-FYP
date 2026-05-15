import 'package:flutter_tts/flutter_tts.dart';
import 'package:orbi_flutter_app/config/constants.dart';
import '../models/assistant_model.dart';


enum TtsState {
  playing,
  stopped,
  paused,
  continued,
}

class TtsService {
  static final TtsService _instance = TtsService._internal();
  factory TtsService() => _instance;
  TtsService._internal();

  final FlutterTts _flutterTts = FlutterTts();

  TtsState _ttsState = TtsState.stopped;
  bool _isInitialized = false;

  void Function(String word)? _onWordSpoken;

  bool get isInitialized => _isInitialized;
  TtsState get ttsState => _ttsState;
  bool get isSpeaking => _ttsState == TtsState.playing;

  // ================= INIT =================

  Future<void> initialize() async {
    if (_isInitialized) return; // ✅ prevent duplicate init

    try {
      _flutterTts.setStartHandler(() {
        _ttsState = TtsState.playing;
      });

      _flutterTts.setCompletionHandler(() {
        _ttsState = TtsState.stopped;
      });

      _flutterTts.setCancelHandler(() {
        _ttsState = TtsState.stopped;
      });

      _flutterTts.setPauseHandler(() {
        _ttsState = TtsState.paused;
      });

      _flutterTts.setContinueHandler(() {
        _ttsState = TtsState.continued;
      });

      _flutterTts.setErrorHandler((msg) {
        _ttsState = TtsState.stopped;
        print('TTS Error: $msg');
      });

      _flutterTts.setProgressHandler(
          (String text, int start, int end, String word) {
        if (_onWordSpoken != null && word.trim().isNotEmpty) {
          _onWordSpoken!(word);
        }
      });

      await _flutterTts.setLanguage(AppConstants.defaultLanguage);

      _isInitialized = true;
    } catch (e) {
      print('TTS Init Error: $e');
      _isInitialized = false;
    }
  }

  // ================= SPEAK =================

  Future<void> speak(
    String text, {
    VoiceSettings? voiceSettings,
    Function? onStart,
    Function? onComplete,
    void Function(String word)? onWord,
  }) async {
    try {
      if (!_isInitialized) await initialize();
      if (text.isEmpty) return;

      await stop();

      _onWordSpoken = onWord;

      if (voiceSettings != null) {
        await _applyVoiceSettings(voiceSettings);
      }

      onStart?.call();

      _ttsState = TtsState.playing;

      await _flutterTts.speak(text);

      await _waitForCompletion(text.length);

      _onWordSpoken = null;

      onComplete?.call();
    } catch (e) {
      print('TTS Speak Error: $e');
      _onWordSpoken = null;
    }
  }

  Future<void> speakWithAssistant(
    String text,
    AssistantModel assistant, {
    Function? onStart,
    Function? onComplete,
    void Function(String word)? onWord,
  }) async {
    await speak(
      text,
      voiceSettings: assistant.voiceSettings,
      onStart: onStart,
      onComplete: onComplete,
      onWord: onWord,
    );
  }

  // ================= CONTROL =================

  Future<void> stop() async {
    try {
      await _flutterTts.stop();
      _ttsState = TtsState.stopped;
    } catch (e) {
      print('Stop Error: $e');
    }
  }

  Future<void> pause() async {
    try {
      await _flutterTts.pause();
      _ttsState = TtsState.paused;
    } catch (e) {
      print('Pause Error: $e');
    }
  }

  // ================= VOICE =================

  Future<void> _applyVoiceSettings(VoiceSettings settings) async {
    try {
      await _flutterTts.setPitch(settings.pitch);
      await _flutterTts.setSpeechRate(settings.rate);
      await _flutterTts.setVolume(settings.volume);

      await _setVoiceByGender(settings.gender);
    } catch (e) {
      print('Voice Settings Error: $e');
    }
  }

  Future<void> _setVoiceByGender(VoiceGender gender) async {
    try {
      final voices = await _flutterTts.getVoices;
      if (voices == null) return;

      final filtered = voices.where((v) {
        final name = (v['name'] ?? '').toString().toLowerCase();
        final locale = (v['locale'] ?? '').toString();

        if (!locale.startsWith('en')) return false;

        switch (gender) {
          case VoiceGender.male:
            return name.contains('male');
          case VoiceGender.female:
            return name.contains('female');
          case VoiceGender.neutral:
            return true;
        }
      }).toList();

      if (filtered.isNotEmpty) {
        final v = filtered.first;
        await _flutterTts.setVoice({
          'name': v['name'],
          'locale': v['locale'],
        });
      }
    } catch (e) {
      print('Voice Error: $e');
    }
  }

  // ================= HELPERS =================

  Future<void> _waitForCompletion(int length) async {
    final maxWait = length * 80 + 2000;
    int elapsed = 0;

    while (_ttsState == TtsState.playing && elapsed < maxWait) {
      await Future.delayed(const Duration(milliseconds: 100));
      elapsed += 100;
    }

    _ttsState = TtsState.stopped;
  }

  // ================= DISPOSE =================

  Future<void> dispose() async {
    await stop();
  }
}