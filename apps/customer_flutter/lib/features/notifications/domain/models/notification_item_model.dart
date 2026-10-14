class NotificationItemModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final String? orderId;
  final String? orderNumber;
  final String appName;
  final String logoUrl;
  final bool isRead;
  final DateTime createdAt;

  NotificationItemModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.orderId,
    this.orderNumber,
    this.appName = 'Kanhaiya General Store',
    this.logoUrl = 'assets/images/kgs_logo.png',
    required this.isRead,
    required this.createdAt,
  });

  NotificationItemModel copyWith({
    String? id,
    String? title,
    String? message,
    String? type,
    String? orderId,
    String? orderNumber,
    String? appName,
    String? logoUrl,
    bool? isRead,
    DateTime? createdAt,
  }) {
    return NotificationItemModel(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      orderId: orderId ?? this.orderId,
      orderNumber: orderNumber ?? this.orderNumber,
      appName: appName ?? this.appName,
      logoUrl: logoUrl ?? this.logoUrl,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory NotificationItemModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return NotificationItemModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Order Update',
      message: json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'ORDER_PLACED',
      orderId: json['orderId']?.toString(),
      orderNumber: json['orderNumber'] as String?,
      appName: json['appName'] as String? ?? 'Kanhaiya General Store',
      logoUrl: json['logoUrl'] as String? ?? 'assets/images/kgs_logo.png',
      isRead: json['isRead'] as bool? ?? false,
      createdAt: parsedDate,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'message': message,
    'type': type,
    'orderId': orderId,
    'orderNumber': orderNumber,
    'appName': appName,
    'logoUrl': logoUrl,
    'isRead': isRead,
    'createdAt': createdAt.toIso8601String(),
  };

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} mins ago';
    if (diff.inHours < 24) return '${diff.inHours} hours ago';
    if (diff.inDays == 1) return 'Yesterday';
    return '${diff.inDays} days ago';
  }

  bool get isOrderRelated =>
      orderNumber != null ||
      orderId != null ||
      type.startsWith('ORDER_') ||
      type == 'PAYMENT_VERIFIED';
}
