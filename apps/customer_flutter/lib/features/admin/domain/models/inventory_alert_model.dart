class InventoryAlertModel {
  final String id;
  final String productId;
  final String productName;
  final String productSku;
  final String productUnit;
  final String? productImage;
  final String alertType; // 'LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY'
  final double currentQuantity;
  final double threshold;
  final String status; // 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
  final String message;
  final String? acknowledgedByName;
  final DateTime? acknowledgedAt;
  final DateTime createdAt;

  const InventoryAlertModel({
    required this.id,
    required this.productId,
    required this.productName,
    this.productSku = '',
    this.productUnit = 'piece',
    this.productImage,
    required this.alertType,
    required this.currentQuantity,
    required this.threshold,
    required this.status,
    required this.message,
    this.acknowledgedByName,
    this.acknowledgedAt,
    required this.createdAt,
  });

  factory InventoryAlertModel.fromJson(Map<String, dynamic> json) {
    String pName = 'Product Alert';
    String pSku = '';
    String pUnit = 'piece';
    String? pImg;
    String pId = '';

    if (json['product'] is Map<String, dynamic>) {
      final pMap = json['product'] as Map<String, dynamic>;
      pId = (pMap['_id'] ?? pMap['id'] ?? '').toString();
      pName = pMap['name'] as String? ?? pName;
      pSku = pMap['sku'] as String? ?? '';
      pUnit = pMap['unit'] as String? ?? 'piece';
      if (pMap['images'] is List && (pMap['images'] as List).isNotEmpty) {
        pImg = (pMap['images'] as List)[0]['url'] as String?;
      }
    } else {
      pId = (json['product'] ?? '').toString();
    }

    String? ackName;
    if (json['acknowledgedBy'] is Map<String, dynamic>) {
      ackName = json['acknowledgedBy']['name'] as String? ??
          json['acknowledgedBy']['email'] as String?;
    }

    return InventoryAlertModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      productId: pId,
      productName: pName,
      productSku: pSku,
      productUnit: pUnit,
      productImage: pImg,
      alertType: json['alertType'] as String? ?? 'LOW_STOCK',
      currentQuantity: (json['currentQuantity'] as num?)?.toDouble() ?? 0.0,
      threshold: (json['threshold'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'ACTIVE',
      message: json['message'] as String? ?? '',
      acknowledgedByName: ackName,
      acknowledgedAt: json['acknowledgedAt'] != null
          ? DateTime.tryParse(json['acknowledgedAt'].toString())
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
