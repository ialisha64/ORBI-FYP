import 'package:flutter/material.dart';
import '../models/assistant_model.dart';

class Model3DViewer extends StatefulWidget {
  final AssistantModel assistant;
  final String animationState;
  final bool isListening;

  const Model3DViewer({
    super.key,
    required this.assistant,
    required this.animationState,
    this.isListening = false,
  });

  @override
  State<Model3DViewer> createState() => _Model3DViewerState();
}

class _Model3DViewerState extends State<Model3DViewer>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _breathController;
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();

    // Pulse animation for listening state
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    // Breathing animation for idle state
    _breathController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);

    // Rotation animation
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _breathController.dispose();
    _rotationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          children: [
            // Background gradient
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    widget.assistant.primaryColor.withValues(alpha: 0.1),
                    widget.assistant.accentColor.withValues(alpha: 0.05),
                  ],
                ),
              ),
            ),

            // 3D Avatar Representation
            Center(
              child: _build3DAvatar(),
            ),

            // Animation state indicator
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Center(
                child: _buildStateIndicator(),
              ),
            ),

            // Listening pulse effect
            if (widget.isListening)
              Positioned.fill(
                child: IgnorePointer(
                  child: AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Container(
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: widget.assistant.primaryColor.withValues(
                              alpha: 0.4 * _pulseController.value,
                            ),
                            width: 4,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _build3DAvatar() {
    return AnimatedBuilder(
      animation: Listenable.merge([_breathController, _rotationController]),
      builder: (context, child) {
        double scale = 1.0;
        double rotation = 0.0;

        switch (widget.animationState) {
          case 'idle':
            // Subtle breathing effect
            scale = 1.0 + (_breathController.value * 0.05);
            break;
          case 'listening':
            // Pulse and slight scale up
            scale = 1.1 + (_pulseController.value * 0.1);
            break;
          case 'thinking':
            // Rotate slightly
            rotation = _rotationController.value * 0.2;
            scale = 1.0;
            break;
          case 'speaking':
            // Gentle bounce
            scale = 1.05 + (_breathController.value * 0.08);
            break;
        }

        return Transform.scale(
          scale: scale,
          child: Transform.rotate(
            angle: rotation,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    widget.assistant.primaryColor,
                    widget.assistant.accentColor,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: widget.assistant.primaryColor.withValues(alpha: 0.4),
                    blurRadius: 40,
                    spreadRadius: 10,
                  ),
                  BoxShadow(
                    color: widget.assistant.accentColor.withValues(alpha: 0.3),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Avatar letter
                  Text(
                    widget.assistant.name[0],
                    style: const TextStyle(
                      fontSize: 80,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),

                  // Face elements for more human-like appearance
                  if (widget.animationState == 'speaking')
                    Positioned(
                      bottom: 60,
                      child: AnimatedBuilder(
                        animation: _breathController,
                        builder: (context, child) {
                          return Container(
                            width: 40 + (_breathController.value * 10),
                            height: 20,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(20),
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStateIndicator() {
    String stateText;
    IconData stateIcon;
    Color stateColor;

    switch (widget.animationState) {
      case 'listening':
        stateText = 'Listening...';
        stateIcon = Icons.hearing;
        stateColor = widget.assistant.primaryColor;
        break;
      case 'thinking':
        stateText = 'Thinking...';
        stateIcon = Icons.psychology;
        stateColor = widget.assistant.accentColor;
        break;
      case 'speaking':
        stateText = 'Speaking...';
        stateIcon = Icons.record_voice_over;
        stateColor = widget.assistant.primaryColor;
        break;
      default:
        stateText = 'Ready';
        stateIcon = Icons.check_circle;
        stateColor = Colors.green;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: stateColor.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(25),
        border: Border.all(
          color: stateColor.withValues(alpha: 0.6),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: stateColor.withValues(alpha: 0.4),
            blurRadius: 12,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(stateIcon, color: stateColor, size: 22),
          const SizedBox(width: 10),
          Text(
            stateText,
            style: TextStyle(
              color: stateColor,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

/*
 * ENHANCED ANIMATED AVATAR
 *
 * This version uses Flutter animations instead of external 3D models
 * to ensure it always works without internet or external dependencies.
 *
 * Features:
 * - Breathing animation in idle state
 * - Pulse effect when listening
 * - Rotation when thinking
 * - Bounce when speaking
 * - Smooth transitions between states
 * - No loading time
 * - Works offline
 *
 * To upgrade to real 3D models later:
 * 1. Download GLB models and place in assets/models/
 * 2. Use model_viewer_plus package
 * 3. Replace this implementation
 */
