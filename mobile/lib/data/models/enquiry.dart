DateTime? _toDate(dynamic value) {
  if (value is String && value.isNotEmpty) return DateTime.tryParse(value);
  if (value is DateTime) return value;
  return null;
}

/// Lifecycle of a negotiation thread.
enum EnquiryStatus {
  open,
  negotiating,
  accepted,
  closed;

  static EnquiryStatus fromString(String? raw) {
    switch (raw?.toUpperCase()) {
      case 'NEGOTIATING':
        return EnquiryStatus.negotiating;
      case 'ACCEPTED':
        return EnquiryStatus.accepted;
      case 'CLOSED':
        return EnquiryStatus.closed;
      default:
        return EnquiryStatus.open;
    }
  }

  String get label {
    switch (this) {
      case EnquiryStatus.open:
        return 'Open';
      case EnquiryStatus.negotiating:
        return 'Negotiating';
      case EnquiryStatus.accepted:
        return 'Accepted';
      case EnquiryStatus.closed:
        return 'Closed';
    }
  }
}

/// A message inside an enquiry thread.
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.content,
    required this.senderId,
    this.senderName,
    this.senderRole,
    this.isRead = false,
    this.createdAt,
  });

  final String id;
  final String content;
  final String senderId;
  final String? senderName;
  final String? senderRole;
  final bool isRead;
  final DateTime? createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    return ChatMessage(
      id: json['id']?.toString() ?? '',
      content: json['content']?.toString() ?? json['message']?.toString() ?? '',
      senderId: json['senderId']?.toString() ??
          (sender is Map ? sender['id']?.toString() ?? '' : ''),
      senderName: sender is Map ? sender['name']?.toString() : null,
      senderRole: sender is Map ? sender['role']?.toString() : null,
      isRead: json['isRead'] == true,
      createdAt: _toDate(json['createdAt']),
    );
  }
}

/// A negotiation thread between a consumer and a farmer.
class Enquiry {
  const Enquiry({
    required this.id,
    required this.subject,
    required this.status,
    this.productId,
    this.product,
    this.farmer,
    this.consumer,
    this.messages = const [],
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String subject;
  final EnquiryStatus status;
  final String? productId;
  final Map<String, dynamic>? product;
  final Map<String, dynamic>? farmer;
  final Map<String, dynamic>? consumer;
  final List<ChatMessage> messages;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  String get productTitle => product?['title']?.toString() ?? 'Produce lot';
  String? get productImage => product?['imageUrl']?.toString();
  String get farmerName {
    final user = farmer?['user'];
    if (user is Map && user['name'] != null) {
      return user['name'].toString();
    }
    return farmer?['farmName']?.toString() ?? 'Cultivator';
  }

  String get consumerName => consumer?['name']?.toString() ?? 'Buyer';
  String get consumerPhone => consumer?['phone']?.toString() ?? '';

  ChatMessage? get lastMessage => messages.isEmpty ? null : messages.last;

  factory Enquiry.fromJson(Map<String, dynamic> json) {
    final rawMessages = json['messages'];
    final messages = rawMessages is List
        ? rawMessages
            .whereType<Map>()
            .map((item) => ChatMessage.fromJson(Map<String, dynamic>.from(item)))
            .toList()
        : <ChatMessage>[];

    return Enquiry(
      id: json['id']?.toString() ?? '',
      subject: json['subject']?.toString() ?? 'Enquiry',
      status: EnquiryStatus.fromString(json['status']?.toString()),
      productId: json['productId']?.toString(),
      product: json['product'] is Map ? Map<String, dynamic>.from(json['product']) : null,
      farmer: json['farmer'] is Map ? Map<String, dynamic>.from(json['farmer']) : null,
      consumer: json['consumer'] is Map ? Map<String, dynamic>.from(json['consumer']) : null,
      messages: messages,
      createdAt: _toDate(json['createdAt']),
      updatedAt: _toDate(json['updatedAt']),
    );
  }
}
