import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  static Future<String> sendMessage(String message) async {
    final response = await http.post(
      Uri.parse(ApiConfig.chatUrl),
      headers: ApiConfig.jsonHeaders,
      body: jsonEncode({"message": message}),
    );

    return jsonDecode(response.body)["reply"];
  }
}
