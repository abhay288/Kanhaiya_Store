class ValidatedCartItemModel {
  final String productId;
  final String name;
  final String brand;
  final String imageUrl;
  final String unit;
  final String packSize;
  final double sellingPrice;
  final double mrp;
  final int requestedQuantity;
  final int validQuantity;
  final int availableStock;
  final double lineSubtotal;
  final double lineMrpTotal;
  final String status; // 'valid' | 'adjusted' | 'out_of_stock' | 'unavailable'
  final String? message;

  const ValidatedCartItemModel({
    required this.productId,
    required this.name,
    this.brand = '',
    this.imageUrl = '',
    this.unit = 'piece',
    this.packSize = '',
    required this.sellingPrice,
    this.mrp = 0,
    required this.requestedQuantity,
    required this.validQuantity,
    required this.availableStock,
    required this.lineSubtotal,
    required this.lineMrpTotal,
    required this.status,
    this.message,
  });

  factory ValidatedCartItemModel.fromJson(Map<String, dynamic> json) {
    return ValidatedCartItemModel(
      productId: json['productId']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
      unit: json['unit'] as String? ?? 'piece',
      packSize: json['packSize'] as String? ?? '',
      sellingPrice: (json['sellingPrice'] as num?)?.toDouble() ?? 0.0,
      mrp: (json['mrp'] as num?)?.toDouble() ?? 0.0,
      requestedQuantity: (json['requestedQuantity'] as num?)?.toInt() ?? 0,
      validQuantity: (json['validQuantity'] as num?)?.toInt() ?? 0,
      availableStock: (json['availableStock'] as num?)?.toInt() ?? 0,
      lineSubtotal: (json['lineSubtotal'] as num?)?.toDouble() ?? 0.0,
      lineMrpTotal: (json['lineMrpTotal'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'valid',
      message: json['message'] as String?,
    );
  }
}

class CartValidationResponseModel {
  final bool isValid;
  final bool hasAdjustments;
  final List<ValidatedCartItemModel> items;
  final double subtotal;
  final double totalMrp;
  final double savings;
  final double deliveryFee;
  final double totalToPay;
  final int itemCount;

  const CartValidationResponseModel({
    this.isValid = true,
    this.hasAdjustments = false,
    this.items = const [],
    this.subtotal = 0,
    this.totalMrp = 0,
    this.savings = 0,
    this.deliveryFee = 0,
    this.totalToPay = 0,
    this.itemCount = 0,
  });

  factory CartValidationResponseModel.fromJson(Map<String, dynamic> json) {
    return CartValidationResponseModel(
      isValid: json['isValid'] as bool? ?? true,
      hasAdjustments: json['hasAdjustments'] as bool? ?? false,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((i) => ValidatedCartItemModel.fromJson(i as Map<String, dynamic>))
          .toList(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      totalMrp: (json['totalMrp'] as num?)?.toDouble() ?? 0.0,
      savings: (json['savings'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      totalToPay: (json['totalToPay'] as num?)?.toDouble() ?? 0.0,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
    );
  }
}
