import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/assistant_model.dart';
import '../providers/conversation_provider.dart';
import '../services/speech_service.dart';
import '../widgets/message_bubble.dart';
import '../widgets/model_3d_viewer.dart';

class ChatScreen extends StatefulWidget {
  final AssistantModel assistant;

  const ChatScreen({
    super.key,
    required this.assistant,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final SpeechService _speechService = SpeechService();
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _initializeConversation();
    _speechService.initialize();
  }

  Future<void> _initializeConversation() async {
    final provider =
        Provider.of<ConversationProvider>(context, listen: false);
    await provider.startConversation(widget.assistant);
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
    final provider = Provider.of<ConversationProvider>(context);

    return Scaffold(
      appBar: _buildAppBar(),
      body: Column(
        children: [
          _build3DViewer(provider),
          Expanded(child: _buildMessages(provider)),
          _buildInput(provider),
        ],
      ),
    );
  }

  // ================= UI =================

  AppBar _buildAppBar() {
    return AppBar(
      title: Text(widget.assistant.name),
    );
  }

  Widget _build3DViewer(ConversationProvider provider) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.3,
      child: Model3DViewer(
        assistant: widget.assistant,
        animationState: provider.state.name,
        isListening: _isListening,
      ),
    );
  }

  Widget _buildMessages(ConversationProvider provider) {
    if (provider.messages.isEmpty) {
      return const Center(child: Text("Start chatting..."));
    }

    return ListView.builder(
      controller: _scrollController,
      itemCount: provider.messages.length,
      itemBuilder: (context, index) {
        final msg = provider.messages[index];
        return MessageBubble(
          message: msg,
          assistant: widget.assistant,
        ).animate().fadeIn();
      },
    );
  }

  Widget _buildInput(ConversationProvider provider) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _messageController,
            decoration: const InputDecoration(
              hintText: "Type message...",
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.mic),
          onPressed: () => _toggleVoice(provider),
        ),
        IconButton(
          icon: const Icon(Icons.send),
          onPressed: () => _send(provider),
        ),
      ],
    );
  }

  // ================= LOGIC =================

  void _send(ConversationProvider provider) {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    provider.sendMessage(text, widget.assistant); // ✅ FIXED
    _messageController.clear();

    // ✅ FIXED SCROLL
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleVoice(ConversationProvider provider) async {
    if (_isListening) {
      await _speechService.stopListening();
      setState(() => _isListening = false);
      provider.setListening(false);
    } else {
      setState(() => _isListening = true);
      provider.setListening(true);

      await _speechService.startListening(
        onResult: (text) {
          setState(() => _isListening = false);
          provider.setListening(false);

          if (text.isNotEmpty) {
            _messageController.text = text;
            _send(provider);
          }
        },
        onError: (error) {
          setState(() => _isListening = false);
          provider.setListening(false);

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(error.toString())),
          );
        },
      );
    }
  }
}