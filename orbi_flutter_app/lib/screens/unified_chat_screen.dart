import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/unified_assistant_model.dart';
import '../providers/conversation_provider.dart';
import '../services/speech_service.dart';
import '../widgets/voice_input_button.dart';
import '../widgets/robot_avatar.dart';
import '../widgets/animated_particles.dart';
import '../models/assistant_model.dart';

class UnifiedChatScreen extends StatefulWidget {
  const UnifiedChatScreen({super.key});

  @override
  State<UnifiedChatScreen> createState() => _UnifiedChatScreenState();
}

class _UnifiedChatScreenState extends State<UnifiedChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final SpeechService _speechService = SpeechService();
  bool _isListening = false;

  final AssistantModel _backendAssistant = AssistantModel.marcus;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeConversation();
    });
    _initializeSpeech();
  }

  Future<void> _initializeConversation() async {
    final conversationProvider =
        Provider.of<ConversationProvider>(context, listen: false);
    await conversationProvider.startConversation(_backendAssistant);
  }

  Future<void> _initializeSpeech() async {
    await _speechService.initialize();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _speechService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final conversationProvider = Provider.of<ConversationProvider>(context);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0A0A1A),
              Color(0xFF0F1128),
              Color(0xFF151A3A),
              Color(0xFF0D1025),
            ],
            stops: [0.0, 0.3, 0.7, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Full-screen particles
              Positioned.fill(
                child: AnimatedParticles(
                  particleColor: UnifiedAssistant.accentColor,
                  particleCount: 30,
                ),
              ),

              // Main content column
              Column(
                children: [
                  _buildAppBar(),
                  Expanded(
                    child: _buildMessagesList(conversationProvider),
                  ),
                  _buildInputArea(conversationProvider),
                ],
              ),

              // Floating robot on the right side - big and prominent
              Positioned(
                right: 30,
                top: 50,
                child: _buildFloatingRobot(conversationProvider),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // Back button
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.08),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new,
                  color: Colors.white70, size: 18),
              onPressed: () => Navigator.pop(context),
              padding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(width: 14),

          // ORBI logo
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  UnifiedAssistant.accentColor,
                  UnifiedAssistant.primaryColor,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: UnifiedAssistant.primaryColor.withOpacity(0.4),
                  blurRadius: 12,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: const Center(
              child: Icon(Icons.smart_toy, color: Colors.white, size: 22),
            ),
          ),
          const SizedBox(width: 12),

          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  UnifiedAssistant.name,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.2,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.greenAccent,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Online',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.greenAccent.withOpacity(0.8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Options
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withOpacity(0.08),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: IconButton(
              icon: const Icon(Icons.more_vert,
                  color: Colors.white70, size: 20),
              onPressed: () => _showOptionsMenu(),
              padding: EdgeInsets.zero,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingRobot(ConversationProvider conversationProvider) {
    return IgnorePointer(
      child: SizedBox(
        width: 320,
        height: 380,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Large radial glow
            Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    UnifiedAssistant.primaryColor.withOpacity(0.15),
                    UnifiedAssistant.accentColor.withOpacity(0.05),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.45, 1.0],
                ),
              ),
            ),

            // The robot avatar - scaled up
            Transform.scale(
              scale: 1.35,
              child: RobotAvatar(
                animationState:
                    _getAnimationState(conversationProvider.state),
                isListening: _isListening,
                primaryColor: UnifiedAssistant.primaryColor,
                accentColor: UnifiedAssistant.accentColor,
                mouthOpenValue: conversationProvider.mouthOpenValue,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getAnimationState(ConversationState state) {
    switch (state) {
      case ConversationState.idle:
        return 'idle';
      case ConversationState.listening:
        return 'listening';
      case ConversationState.thinking:
        return 'thinking';
      case ConversationState.speaking:
        return 'speaking';
    }
  }

  Widget _buildMessagesList(ConversationProvider conversationProvider) {
    if (conversationProvider.messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.only(right: 140),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.chat_bubble_outline_rounded,
                size: 56,
                color: UnifiedAssistant.accentColor.withOpacity(0.2),
              ),
              const SizedBox(height: 16),
              Text(
                'Start a conversation',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.white.withOpacity(0.45),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Ask ORBI anything!',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.25),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(left: 16, right: 300, top: 12, bottom: 12),
      itemCount: conversationProvider.messages.length,
      itemBuilder: (context, index) {
        final message = conversationProvider.messages[index];
        return _buildChatBubble(message)
            .animate()
            .fadeIn(duration: 300.ms)
            .slideY(begin: 0.12, end: 0);
      },
    );
  }

  Widget _buildChatBubble(dynamic message) {
    final isUser = message.isFromUser;

    return Padding(
      padding: const EdgeInsets.only(
        top: 5,
        bottom: 5,
      ),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Assistant avatar
          if (!isUser) ...[
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    UnifiedAssistant.accentColor,
                    UnifiedAssistant.primaryColor,
                  ],
                ),
              ),
              child: const Center(
                child:
                    Icon(Icons.smart_toy, color: Colors.white, size: 15),
              ),
            ),
            const SizedBox(width: 8),
          ],

          // Bubble
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.5,
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser
                    ? UnifiedAssistant.primaryColor.withOpacity(0.75)
                    : Colors.white.withOpacity(0.07),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
                border: isUser
                    ? null
                    : Border.all(color: Colors.white.withOpacity(0.06)),
                boxShadow: [
                  BoxShadow(
                    color: isUser
                        ? UnifiedAssistant.primaryColor.withOpacity(0.25)
                        : Colors.black.withOpacity(0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: TextStyle(
                      color: isUser
                          ? Colors.white
                          : Colors.white.withOpacity(0.88),
                      fontSize: 14.5,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${message.timestamp.hour.toString().padLeft(2, '0')}:${message.timestamp.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(
                      color: isUser
                          ? Colors.white.withOpacity(0.45)
                          : Colors.white.withOpacity(0.25),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // User avatar
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.1),
                border:
                    Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: const Icon(Icons.person,
                  size: 15, color: Colors.white60),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInputArea(ConversationProvider conversationProvider) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: Row(
        children: [
          // Text input
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.92),
                borderRadius: BorderRadius.circular(26),
                border:
                    Border.all(color: Colors.white.withOpacity(0.3)),
              ),
              child: TextField(
                controller: _messageController,
                style:
                    const TextStyle(color: Color(0xFF1A1A2E), fontSize: 14.5),
                decoration: InputDecoration(
                  hintText: 'Ask ORBI anything...',
                  hintStyle: TextStyle(
                    color: const Color(0xFF1A1A2E).withOpacity(0.4),
                    fontSize: 14.5,
                  ),
                  border: InputBorder.none,
                  contentPadding:
                      const EdgeInsets.symmetric(vertical: 12),
                ),
                maxLines: null,
                textCapitalization: TextCapitalization.sentences,
                onSubmitted: (_) => _sendMessage(conversationProvider),
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Voice button
          VoiceInputButton(
            isListening: _isListening,
            assistant: _backendAssistant,
            onTap: () => _toggleVoiceInput(conversationProvider),
          ),
          const SizedBox(width: 8),

          // Send button
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  UnifiedAssistant.accentColor,
                  UnifiedAssistant.primaryColor,
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: UnifiedAssistant.primaryColor.withOpacity(0.4),
                  blurRadius: 12,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: IconButton(
              icon: const Icon(Icons.send_rounded,
                  color: Colors.white, size: 20),
              onPressed: conversationProvider.isLoading
                  ? null
                  : () => _sendMessage(conversationProvider),
              padding: EdgeInsets.zero,
            ),
          ),
        ],
      ),
    );
  }

  void _sendMessage(ConversationProvider conversationProvider) {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    conversationProvider.sendMessageStream(text, _backendAssistant);
    _messageController.clear();

    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleVoiceInput(
      ConversationProvider conversationProvider) async {
    if (_isListening) {
      await _speechService.stopListening();
      setState(() => _isListening = false);
      conversationProvider.setListening(false);
    } else {
      setState(() => _isListening = true);
      conversationProvider.setListening(true);

      await _speechService.startListening(
        onResult: (text) {
          setState(() => _isListening = false);
          conversationProvider.setListening(false);

          if (text.isNotEmpty) {
            _messageController.text = text;
            _sendMessage(conversationProvider);
          }
        },
        onError: (error) {
          setState(() => _isListening = false);
          conversationProvider.setListening(false);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Speech error: $error')),
          );
        },
      );
    }
  }

  void _showOptionsMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A35),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final conversationProvider =
            Provider.of<ConversationProvider>(context);

        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              _buildMenuTile(Icons.delete_outline, 'Clear Conversation',
                  Colors.redAccent, () {
                conversationProvider.clearConversation();
                Navigator.pop(context);
              }),
              _buildMenuTile(Icons.volume_off_rounded, 'Stop Speaking',
                  Colors.orangeAccent, () {
                conversationProvider.stopSpeaking();
                Navigator.pop(context);
              }),
              _buildMenuTile(Icons.arrow_back_rounded, 'Back to Home',
                  Colors.white70, () {
                Navigator.pop(context);
                Navigator.pop(context);
              }),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMenuTile(
      IconData icon, String title, Color iconColor, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: iconColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title,
          style: const TextStyle(color: Colors.white, fontSize: 15)),
      onTap: onTap,
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}
