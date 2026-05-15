class ApiConfig {
  // ── Base URL ─────────────────────────────────────────────────────────────
  // For Android emulator:   http://10.0.2.2:<port>
  // For real Android device: http://<your-PC-LAN-IP>:<port>  e.g. http://192.168.1.5:8001
  static const String baseUrl = 'http://localhost:8001';

  // ── Endpoints ─────────────────────────────────────────────────────────────
  static String get chatUrl    => '$baseUrl/chat';
  static String get aiAskUrl   => '$baseUrl/ai/ask';

  // ── Headers ───────────────────────────────────────────────────────────────
  static Map<String, String> get jsonHeaders => {
    'Content-Type': 'application/json',
  };

  static Map<String, String> authHeaders(String token) => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };
}
