import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/assistant_model.dart';
import '../providers/assistant_provider.dart';
import '../providers/theme_provider.dart';
import '../config/theme_config.dart';
import 'chat_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final assistantProvider = Provider.of<AssistantProvider>(context);
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

              // Assistants List
              Expanded(
                child: _buildAssistantsList(context, assistantProvider),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Choose Your\nAssistant',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
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
          const SizedBox(height: 8),
          Text(
            'Select one of three unique AI personalities',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey,
                ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 500.ms).slideY(begin: -0.2, end: 0);
  }

  Widget _buildAssistantsList(
    BuildContext context,
    AssistantProvider assistantProvider,
  ) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: assistantProvider.allAssistants.length,
      itemBuilder: (context, index) {
        final assistant = assistantProvider.allAssistants[index];
        return _buildAssistantCard(context, assistant, index, assistantProvider);
      },
    );
  }

  Widget _buildAssistantCard(
    BuildContext context,
    AssistantModel assistant,
    int index,
    AssistantProvider assistantProvider,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _selectAssistant(context, assistant, assistantProvider),
          borderRadius: BorderRadius.circular(24),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  assistant.primaryColor.withOpacity(0.1),
                  assistant.accentColor.withOpacity(0.05),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: assistant.primaryColor.withOpacity(0.3),
                width: 2,
              ),
              boxShadow: ThemeConfig.softShadow,
            ),
            child: Stack(
              children: [
                // Content
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar placeholder (will be 3D model later)
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              assistant.primaryColor,
                              assistant.accentColor,
                            ],
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: assistant.primaryColor.withOpacity(0.4),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            assistant.name[0],
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Name and title
                      Text(
                        assistant.name,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: assistant.primaryColor,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        assistant.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: assistant.accentColor,
                            ),
                      ),
                      const SizedBox(height: 12),

                      // Description
                      Text(
                        assistant.description,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey[700],
                            ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 16),

                      // Specialties
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: assistant.specialties.take(3).map((specialty) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: assistant.primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: assistant.primaryColor.withOpacity(0.3),
                              ),
                            ),
                            child: Text(
                              specialty,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: assistant.primaryColor,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 16),

                      // Talk Now button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () =>
                              _selectAssistant(context, assistant, assistantProvider),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: assistant.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 0,
                          ),
                          child: const Text(
                            'Talk Now',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Decorative element
                Positioned(
                  right: -20,
                  top: -20,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          assistant.accentColor.withOpacity(0.2),
                          assistant.accentColor.withOpacity(0.05),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms, delay: (index * 100).ms)
        .slideX(begin: 0.2, end: 0);
  }

  void _selectAssistant(
    BuildContext context,
    AssistantModel assistant,
    AssistantProvider assistantProvider,
  ) {
    assistantProvider.selectAssistant(assistant);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChatScreen(assistant: assistant),
      ),
    );
  }
}
