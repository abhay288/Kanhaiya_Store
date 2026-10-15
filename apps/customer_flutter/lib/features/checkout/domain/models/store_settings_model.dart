class StoreSettingsModel {
  final String storeName;
  final String phone;
  final String whatsappNumber;
  final String? upiId;
  final String storeAddress;
  final String pickupInstructions;
  final bool isDeliveryEnabled;
  final List<String> serviceablePincodes;
  final double minOrderValue;
  final double standardDeliveryFee;
  final double freeDeliveryThreshold;
  final String estimatedDeliveryWindow;
  final bool isWhatsappQrEnabled;
  final String currency;
  final String currencySymbol;

  const StoreSettingsModel({
    required this.storeName,
    required this.phone,
    required this.whatsappNumber,
    this.upiId,
    required this.storeAddress,
    required this.pickupInstructions,
    required this.isDeliveryEnabled,
    required this.serviceablePincodes,
    required this.minOrderValue,
    required this.standardDeliveryFee,
    required this.freeDeliveryThreshold,
    required this.estimatedDeliveryWindow,
    required this.isWhatsappQrEnabled,
    this.currency = 'INR',
    this.currencySymbol = '₹',
  });

  factory StoreSettingsModel.fromJson(Map<String, dynamic> json) {
    return StoreSettingsModel(
      storeName: json['storeName'] ?? 'Kanhaiya General Store',
      phone: json['phone'] ?? '+919876543210',
      whatsappNumber: json['whatsappNumber'] ?? '+919876543210',
      upiId: json['upiId'],
      storeAddress: (json['storeAddress'] != null && json['storeAddress'].toString().contains('Kanpur D.'))
          ? 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh'
          : (json['storeAddress'] ?? 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh'),
      pickupInstructions: json['pickupInstructions'] ??
          'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
      isDeliveryEnabled: json['isDeliveryEnabled'] ?? false,
      serviceablePincodes: (json['serviceablePincodes'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          ['209304', '209305', '208001', '208002'],
      minOrderValue: (json['minOrderValue'] as num?)?.toDouble() ?? 100.0,
      standardDeliveryFee: (json['standardDeliveryFee'] as num?)?.toDouble() ?? 30.0,
      freeDeliveryThreshold: (json['freeDeliveryThreshold'] as num?)?.toDouble() ?? 500.0,
      estimatedDeliveryWindow: json['estimatedDeliveryWindow'] ?? 'Same-day delivery within 2-4 hours',
      isWhatsappQrEnabled: json['isWhatsappQrEnabled'] ?? false,
      currency: json['currency'] ?? 'INR',
      currencySymbol: json['currencySymbol'] ?? '₹',
    );
  }

  static const defaultSettings = StoreSettingsModel(
    storeName: 'Kanhaiya General Store',
    phone: '+91 9936269347',
    whatsappNumber: '+91 9936269347',
    upiId: 'kanhaiyastore@upi',
    storeAddress: 'Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh',
    pickupInstructions:
        'Orders are packed and kept ready at the store counter. Please share your Order Number when collecting.',
    isDeliveryEnabled: false,
    serviceablePincodes: ['209304', '209305', '208001', '208002'],
    minOrderValue: 100.0,
    standardDeliveryFee: 30.0,
    freeDeliveryThreshold: 500.0,
    estimatedDeliveryWindow: 'Same-day delivery within 2-4 hours',
    isWhatsappQrEnabled: false,
  );
}

class ServiceabilityResultModel {
  final bool serviceable;
  final String pincode;
  final bool isDeliveryEnabled;
  final String estimatedDeliveryWindow;
  final double deliveryFee;
  final double freeDeliveryThreshold;
  final double minOrderValue;
  final String message;

  const ServiceabilityResultModel({
    required this.serviceable,
    required this.pincode,
    required this.isDeliveryEnabled,
    required this.estimatedDeliveryWindow,
    required this.deliveryFee,
    required this.freeDeliveryThreshold,
    required this.minOrderValue,
    required this.message,
  });

  factory ServiceabilityResultModel.fromJson(Map<String, dynamic> json) {
    return ServiceabilityResultModel(
      serviceable: json['serviceable'] ?? false,
      pincode: json['pincode'] ?? '',
      isDeliveryEnabled: json['isDeliveryEnabled'] ?? true,
      estimatedDeliveryWindow: json['estimatedDeliveryWindow'] ?? '',
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 30.0,
      freeDeliveryThreshold: (json['freeDeliveryThreshold'] as num?)?.toDouble() ?? 500.0,
      minOrderValue: (json['minOrderValue'] as num?)?.toDouble() ?? 100.0,
      message: json['message'] ?? '',
    );
  }
}
