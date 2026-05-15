import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/assistant_model.dart';

class AssistantProvider with ChangeNotifier {
  AssistantModel? _selectedAssistant;
  final List<AssistantModel> _allAssistants = AssistantModel.allAssistants;

  // Getters
  AssistantModel? get selectedAssistant => _selectedAssistant;
  List<AssistantModel> get allAssistants => _allAssistants;
  bool get hasSelectedAssistant => _selectedAssistant != null;

  // Constructor
  AssistantProvider() {
    _loadSelectedAssistant();
  }

  // Load selected assistant from storage
  Future<void> _loadSelectedAssistant() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final assistantId = prefs.getString('selected_assistant'); // ✅ simple key

      if (assistantId != null) {
        _selectedAssistant = AssistantModel.getById(assistantId);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Load Selected Assistant Error: $e');
    }
  }

  // Select assistant
  Future<void> selectAssistant(AssistantModel assistant) async {
    try {
      _selectedAssistant = assistant;
      notifyListeners();

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('selected_assistant', assistant.id); // ✅ simple key
    } catch (e) {
      debugPrint('Select Assistant Error: $e');
    }
  }

  // Clear selection
  Future<void> clearSelection() async {
    try {
      _selectedAssistant = null;
      notifyListeners();

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('selected_assistant'); // ✅ simple key
    } catch (e) {
      debugPrint('Clear Selection Error: $e');
    }
  }

  // Get assistant by type
  AssistantModel getAssistantByType(AssistantType type) {
    return AssistantModel.getByType(type);
  }

  // Get assistant by ID
  AssistantModel? getAssistantById(String id) {
    return AssistantModel.getById(id);
  }

  // Get random greeting
  String? getRandomGreeting() {
    return _selectedAssistant?.getRandomGreeting();
  }

  // Get random farewell
  String? getRandomFarewell() {
    return _selectedAssistant?.getRandomFarewell();
  }
}