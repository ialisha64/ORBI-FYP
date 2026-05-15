import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/unified_assistant_model.dart';
import '../providers/theme_provider.dart';
import '../config/theme_config.dart';
import 'unified_chat_screen.dart';
import '../widgets/robot_avatar.dart';

class UnifiedHomeScreen extends StatelessWidget {
  const UnifiedHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: themeProvider.isDarkMode
              ? ThemeConfig.darkBackgroundGradient
              : ThemeConfig.backgroundGradient,
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(context, themeProvider),

              // Robot Assistant Card
              Expanded(
                child: Center(
                  child: _buildRobotCard(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, ThemeProvider themeProvider) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Welcome to',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.grey[600],
                    ),
              ),
              Text(
                'ORBI Assistant',
                style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      fontSize: 32,
                    ),
              ),
            ],
          ),
          IconButton(
            icon: Icon(
              themeProvider.isDarkMode ? Icons.light_mode : Icons.dark_mode,
              size: 28,
            ),
            onPressed: () => themeProvider.toggleTheme(),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: -0.2, end: 0);
  }

  Widget _buildRobotCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(20),
      constraints: const BoxConstraints(maxWidth: 500),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _startChat(context),
          borderRadius: BorderRadius.circular(30),
          child: Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  UnifiedAssistant.primaryColor.withValues(alpha: 0.15),
                  UnifiedAssistant.accentColor.withValues(alpha: 0.1),
                ],
              ),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: UnifiedAssistant.primaryColor.withValues(alpha: 0.4),
                width: 3,
              ),
              boxShadow: ThemeConfig.mediumShadow,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Robot Avatar - smaller size to fit better
                  SizedBox(
                    width: 200,
                    height: 200,
                    child: const RobotAvatar(
                      animationState: 'idle',
                      primaryColor: UnifiedAssistant.primaryColor,
                      accentColor: UnifiedAssistant.accentColor,
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Name
                  Text(
                    UnifiedAssistant.name,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: UnifiedAssistant.primaryColor,
                          fontSize: 32,
                          letterSpacing: 2,
                        ),
                  ),

                  const SizedBox(height: 6),

                  // Title
                  Text(
                    UnifiedAssistant.title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w500,
                          color: UnifiedAssistant.accentColor,
                          fontSize: 18,
                        ),
                  ),

                  const SizedBox(height: 15),

                  // Description
                  Text(
                    UnifiedAssistant.description,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Colors.grey[700],
                          height: 1.4,
                          fontSize: 14,
                        ),
                  ),

                  const SizedBox(height: 20),

                  // Capabilities Grid
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: UnifiedAssistant.capabilities.map((capability) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: UnifiedAssistant.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: UnifiedAssistant.primaryColor.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          capability,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: UnifiedAssistant.primaryColor,
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 25),

                  // Start Chat Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _startChat(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: UnifiedAssistant.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                        ),
                        elevation: 5,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.chat_bubble_outline, size: 22),
                          const SizedBox(width: 10),
                          const Text(
                            'Start Chatting with ORBI',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 600.ms, delay: 200.ms)
        .scale(begin: const Offset(0.8, 0.8), end: const Offset(1.0, 1.0));
  }

  void _startChat(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const UnifiedChatScreen(),
      ),
    );
  }
}
