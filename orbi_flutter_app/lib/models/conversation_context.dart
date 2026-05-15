class ConversationContext {
  final String conversationId;
  final String assistantId;
  final List<String> messageIds;
  final DateTime startedAt;
  final DateTime lastActivityAt;
  final Map<String, dynamic> metadata;

  ConversationContext({
    required this.conversationId,
    required this.assistantId,
    required this.messageIds,
    required this.startedAt,
    required this.lastActivityAt,
    this.metadata = const {},
  });

  // Copy with method
  ConversationContext copyWith({
    String? conversationId,
    String? assistantId,
    List<String>? messageIds,
    DateTime? startedAt,
    DateTime? lastActivityAt,
    Map<String, dynamic>? metadata,
  }) {
    return ConversationContext(
      conversationId: conversationId ?? this.conversationId,
      assistantId: assistantId ?? this.assistantId,
      messageIds: messageIds ?? this.messageIds,
      startedAt: startedAt ?? this.startedAt,
      lastActivityAt: lastActivityAt ?? this.lastActivityAt,
      metadata: metadata ?? this.metadata,
    );
  }

  // Add message to context
  ConversationContext addMessage(String messageId) {
    return copyWith(
      messageIds: [...messageIds, messageId],
      lastActivityAt: DateTime.now(),
    );
  }

  // Convert to JSON
  Map<String, dynamic> toJson() => {
        'conversationId': conversationId,
        'assistantId': assistantId,
        'messageIds': messageIds,
        'startedAt': startedAt.toIso8601String(),
        'lastActivityAt': lastActivityAt.toIso8601String(),
        'metadata': metadata,
      };

  // Create from JSON
  factory ConversationContext.fromJson(Map<String, dynamic> json) {
    return ConversationContext(
      conversationId: json['conversationId'] as String,
      assistantId: json['assistantId'] as String,
      messageIds: (json['messageIds'] as List<dynamic>).cast<String>(),
      startedAt: DateTime.parse(json['startedAt'] as String),
      lastActivityAt: DateTime.parse(json['lastActivityAt'] as String),
      metadata: json['metadata'] as Map<String, dynamic>? ?? {},
    );
  }

  // Get context window (last N messages)
  List<String> getRecentMessages({int limit = 20}) {
    if (messageIds.length <= limit) {
      return messageIds;
    }
    return messageIds.sublist(messageIds.length - limit);
  }
}
