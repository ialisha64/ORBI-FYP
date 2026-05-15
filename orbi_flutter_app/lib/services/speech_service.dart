import 'package:speech_to_text/speech_to_text.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:orbi_flutter_app/config/constants.dart';

class SpeechService {
  static final SpeechService _instance = SpeechService._internal();
  factory SpeechService() => _instance;
  SpeechService._internal();

  final SpeechToText _speechToText = SpeechToText();

  bool _isInitialized = false;
  bool _isListening = false;

  bool get isInitialized => _isInitialized;
  bool get isListening => _isListening;
  bool get isAvailable => _speechToText.isAvailable;

  // ================= INIT =================

  Future<bool> initialize() async {
    if (_isInitialized) return true; // ✅ prevent duplicate init

    try {
      final permission = await Permission.microphone.request();
      if (!permission.isGranted) {
        throw Exception('Microphone permission denied');
      }

      _isInitialized = await _speechToText.initialize(
        onError: (error) => _handleError(error.errorMsg),
        onStatus: (status) => _handleStatus(status),
      );

      return _isInitialized;
    } catch (e) {
      print('Speech Init Error: $e');
      return false;
    }
  }

  // ================= LISTEN =================

  Future<void> startListening({
    required Function(String text) onResult,
    Function(String error)? onError,
    String language = AppConstants.defaultLanguage,
  }) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      if (!_isInitialized) {
        throw Exception('Speech not initialized');
      }

      _isListening = true;

      await _speechToText.listen(
        onResult: (result) {
          if (result.finalResult) {
            _isListening = false;
            onResult(result.recognizedWords);
          }
        },
        localeId: language,
        listenFor: AppConstants.listeningTimeout,
        pauseFor: AppConstants.speechTimeout,
        partialResults: true,
        cancelOnError: true,
        listenMode: ListenMode.confirmation,
      );
    } catch (e) {
      _isListening = false;

      if (onError != null) {
        onError(e.toString());
      }

      print('Speech Listen Error: $e');
    }
  }

  // ================= STOP =================

  Future<void> stopListening() async {
    try {
      if (_isListening) {
        await _speechToText.stop();
        _isListening = false;
      }
    } catch (e) {
      print('Stop Error: $e');
    }
  }

  Future<void> cancelListening() async {
    try {
      if (_isListening) {
        await _speechToText.cancel();
        _isListening = false;
      }
    } catch (e) {
      print('Cancel Error: $e');
    }
  }

  // ================= LOCALES =================

  Future<List<LocaleName>> getAvailableLocales() async {
    try {
      if (!_isInitialized) {
        await initialize();
      }
      return await _speechToText.locales();
    } catch (e) {
      print('Locales Error: $e');
      return [];
    }
  }

  Future<bool> isLocaleSupported(String locale) async {
    final locales = await getAvailableLocales();
    return locales.any((l) => l.localeId == locale);
  }

  // ================= HELPERS =================

  void _handleError(String error) {
    _isListening = false;
    print('Speech Error: $error');
  }

  void _handleStatus(String status) {
    print('Speech Status: $status');

    if (status == 'done' || status == 'notListening') {
      _isListening = false;
    }
  }

  bool containsWakeWord(String text) {
    final lower = text.toLowerCase();
    return AppConstants.wakeWords
        .any((word) => lower.contains(word.toLowerCase()));
  }

  String? extractCommand(String text) {
    final lower = text.toLowerCase();

    for (var word in AppConstants.wakeWords) {
      final w = word.toLowerCase();
      if (lower.contains(w)) {
        final index = lower.indexOf(w);
        final cmd = text.substring(index + word.length).trim();
        return cmd.isNotEmpty ? cmd : null;
      }
    }
    return null;
  }

  // ================= DISPOSE =================

  Future<void> dispose() async {
    await stopListening();
  }
}