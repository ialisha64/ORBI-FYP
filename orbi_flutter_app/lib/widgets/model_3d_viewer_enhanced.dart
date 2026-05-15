import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';
import '../models/assistant_model.dart';

class Model3DViewerEnhanced extends StatefulWidget {
  final AssistantModel assistant;
  final String animationState;
  final bool isListening;

  const Model3DViewerEnhanced({
    super.key,
    required this.assistant,
    required this.animationState,
    this.isListening = false,
  });

  @override
  State<Model3DViewerEnhanced> createState() => _Model3DViewerEnhancedState();
}

class _Model3DViewerEnhancedState extends State<Model3DViewerEnhanced>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  bool _modelLoaded = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  // Get the 3D model URL based on assistant
  String get _modelUrl {
    // Using Ready Player Me default avatars as examples
    // You can replace these with your own GLB files
    switch (widget.assistant.type) {
      case AssistantType.marcus:
        // Professional male avatar
        return 'https://models.readyplayer.me/64bfa15f0e72c63d7c3f4c5a.glb';
      case AssistantType.aria:
        // Creative female avatar
        return 'https://models.readyplayer.me/64bfa15f0e72c63d7c3f4c5b.glb';
      case AssistantType.alex:
        // Neutral avatar
        return 'https://models.readyplayer.me/64bfa15f0e72c63d7c3f4c5c.glb';
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          children: [
            // Background gradient
            Container(
              width: constraints.maxWidth,
              height: constraints.maxHeight,
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

            // 3D Model Viewer
            if (!_hasError)
              Center(
                child: SizedBox(
                  width: constraints.maxWidth,
                  height: constraints.maxHeight,
                  child: ModelViewer(
                    src: _modelUrl,
                    alt: '${widget.assistant.name} 3D Avatar',
                    autoRotate: false,
                    cameraControls: true,
                    touchAction: TouchAction.panY,
                    backgroundColor: Colors.transparent,
                    loading: Loading.eager,
                    interactionPrompt: InteractionPrompt.none,
                    ar: false,
                    cameraOrbit: _getCameraOrbit(),
                    fieldOfView: '30deg',
                    minCameraOrbit: 'auto 0deg auto',
                    maxCameraOrbit: 'auto 180deg auto',
                    shadowIntensity: 1.0,
                    shadowSoftness: 0.8,
                    exposure: 1.0,
                    onWebViewCreated: (_) {
                      setState(() => _modelLoaded = true);
                    },
                  ),
                ),
              ),

            // Fallback placeholder if model fails to load
            if (_hasError) _buildFallbackAvatar(),

            // Loading indicator
            if (!_modelLoaded && !_hasError)
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                        widget.assistant.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Loading 3D Avatar...',
                      style: TextStyle(
                        color: widget.assistant.primaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
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
                child: AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    return Container(
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: widget.assistant.primaryColor.withValues(
                            alpha: 0.3 * _pulseController.value,
                          ),
                          width: 4,
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }

  // Get camera orbit based on animation state
  String _getCameraOrbit() {
    switch (widget.animationState) {
      case 'listening':
        return '0deg 75deg 1.5m'; // Closer view
      case 'thinking':
        return '45deg 85deg 2m'; // Side view
      case 'speaking':
        return '0deg 75deg 1.5m'; // Front view
      default:
        return '0deg 75deg 2m'; // Default idle view
    }
  }

  // Fallback avatar when model fails
  Widget _buildFallbackAvatar() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 150,
            height: 150,
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
                  color: widget.assistant.primaryColor.withValues(alpha: 0.3),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Center(
              child: Text(
                widget.assistant.name[0],
                style: const TextStyle(
                  fontSize: 64,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '3D Model Unavailable',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  // State indicator widget
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: stateColor.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: stateColor.withValues(alpha: 0.5),
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: stateColor.withValues(alpha: 0.3),
            blurRadius: 8,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(stateIcon, color: stateColor, size: 20),
          const SizedBox(width: 8),
          Text(
            stateText,
            style: TextStyle(
              color: stateColor,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

/*
 * USING YOUR OWN 3D MODELS:
 *
 * 1. Download GLB models from:
 *    - Ready Player Me: https://readyplayer.me/
 *    - Mixamo: https://www.mixamo.com/
 *    - Sketchfab: https://sketchfab.com/
 *
 * 2. Place models in: assets/models/
 *    - assistant_1_male_professional.glb
 *    - assistant_2_female_creative.glb
 *    - assistant_3_neutral_organizer.glb
 *
 * 3. Update _modelUrl getter to use local assets:
 *    return 'assets/models/assistant_1_male_professional.glb';
 *
 * 4. Update pubspec.yaml to include assets folder
 */
