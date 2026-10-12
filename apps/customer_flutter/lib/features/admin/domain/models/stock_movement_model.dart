class StockMovementModel {
  final String id;
  final String productId;
  final String productName;
  final String productSku;
  final String productUnit;
  final String? productImage;
  final double previousQuantity;
  final double changeQuantity;
  final double finalQuantity;
  final String adjustmentType;
  final String reason;
  final String? referenceNumber;
  final String? batchNumber;
  final DateTime? expiryDate;
  final String? performerName;
  final String? performerEmail;
  final DateTime createdAt;

  const StockMovementModel({
    required this.id,
    required this.productId,
    required this.productName,
    this.productSku = '',
    this.productUnit = 'piece',
    this.productImage,
    required this.previousQuantity,
    required this.changeQuantity,
    required this.finalQuantity,
    required this.adjustmentType,
    required this.reason,
    this.referenceNumber,
    this.batchNumber,
    this.expiryDate,
    this.performerName,
    this.performerEmail,
    required this.createdAt,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> json) {
    String pName = 'Unknown Product';
    String pSku = '';
    String pUnit = 'piece';
    String? pImg;
    String pId = '';

    if (json['productId'] is Map<String, dynamic>) {
      final pMap = json['productId'] as Map<String, dynamic>;
      pId = (pMap['_id'] ?? pMap['id'] ?? '').toString();
      pName = pMap['name'] as String? ?? pName;
      pSku = pMap['sku'] as String? ?? '';
      pUnit = pMap['unit'] as String? ?? 'piece';
      if (pMap['images'] is List && (pMap['images'] as List).isNotEmpty) {
        pImg = (pMap['images'] as List)[0]['url'] as String?;
      }
    } else {
      pId = (json['productId'] ?? '').toString();
    }

    return StockMovementModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      productId: pId,
      productName: pName,
      productSku: pSku,
      productUnit: pUnit,
      productImage: pImg,
      previousQuantity: (json['previousQuantity'] as num?)?.toDouble() ?? 0.0,
      changeQuantity: (json['changeQuantity'] as num?)?.toDouble() ?? 0.0,
      finalQuantity: (json['finalQuantity'] as num?)?.toDouble() ?? 0.0,
      adjustmentType: json['adjustmentType'] as String? ?? 'MANUAL_INCREASE',
      reason: json['reason'] as String? ?? '',
      referenceNumber: json['referenceNumber'] as String?,
      batchNumber: json['batchNumber'] as String?,
      expiryDate: json['expiryDate'] != null
          ? DateTime.tryParse(json['expiryDate'].toString())
          : null,
      performerName: json['performerName'] as String?,
      performerEmail: json['performerEmail'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
