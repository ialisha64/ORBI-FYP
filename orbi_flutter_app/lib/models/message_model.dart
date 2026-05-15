import 'package:hive/hive.dart';

part 'message_model.g.dart';

enum MessageType {
  text,
  voice,
  task,
  systemNotification,
}

enum MessageSender {
  user,
  assistant,
  system,
}

@HiveType(typeId: 0)
class Message {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String content;

  @HiveField(2)
  final MessageType type;

  @HiveField(3)
  final MessageSender sender;

  @HiveField(4)
  final DateTime timestamp;

  @HiveField(5)
  final String? assistantId;

  @HiveField(6)
  final bool? isRead;

  @HiveField(7)
  final Map<String, dynamic>? metadata;

  Message({
    required this.id,
    required this.content,
    required this.type,
    required this.sender,
    required this.timestamp,
    this.assistantId,
    this.isRead = false,
    this.metadata,
  });

  // Create a copy with modified fields
  Message copyWith({
    String? id,
    String? content,
    MessageType? type,
    MessageSender? sender,
    DateTime? timestamp,
    String? assistantId,
    bool? isRead,
    Map<String, dynamic>? metadata,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      type: type ?? this.type,
      sender: sender ?? this.sender,
      timestamp: timestamp ?? this.timestamp,
      assistantId: assistantId ?? this.assistantId,
      isRead: isRead ?? this.isRead,
      metadata: metadata ?? this.metadata,
    );
  }

  // Convert to JSON
  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'type': type.toString(),
        'sender': sender.toString(),
        'timestamp': timestamp.toIso8601String(),
        'assistantId': assistantId,
        'isRead': isRead,
        'metadata': metadata,
      };

  // Create from JSON
  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      content: json['content'] as String,
      type: MessageType.values.firstWhere(
        (e) => e.toString() == json['type'],
        orElse: () => MessageType.text,
      ),
      sender: MessageSender.values.firstWhere(
        (e) => e.toString() == json['sender'],
        orElse: () => MessageSender.user,
      ),
      timestamp: DateTime.parse(json['timestamp'] as String),
      assistantId: json['assistantId'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  // Helper methods
  bool get isFromUser => sender == MessageSender.user;
  bool get isFromAssistant => sender == MessageSender.assistant;
  bool get isSystemMessage => sender == MessageSender.system;
}
