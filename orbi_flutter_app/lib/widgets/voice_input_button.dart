import 'package:flutter/material.dart';
import 'package:avatar_glow/avatar_glow.dart';
import '../models/assistant_model.dart';

class VoiceInputButton extends StatelessWidget {
  final bool isListening;
  final AssistantModel assistant;
  final VoidCallback onTap;

  const VoiceInputButton({
    super.key,
    required this.isListening,
    required this.assistant,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isListening) {
      return AvatarGlow(
        glowColor: assistant.primaryColor,
        glowShape: BoxShape.circle,
        animate: true,
        child: _buildButton(context),
      );
    }

    return _buildButton(context);
  }

  Widget _buildButton(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            assistant.accentColor,
            assistant.primaryColor,
          ],
        ),
        shape: BoxShape.circle,
        boxShadow: [
          if (isListening)
            BoxShadow(
              color: assistant.primaryColor.withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 2,
            ),
        ],
      ),
      child: IconButton(
        icon: Icon(
          isListening ? Icons.mic : Icons.mic_none,
          color: Colors.white,
        ),
        onPressed: onTap,
        iconSize: 24,
      ),
    );
  }
}
