class AnalyticsOverviewModel {
  final int totalOrders;
  final int ordersToday;
  final int awaitingConfirmation;
  final int completedOrders;
  final int cancelledOrders;
  final double grossOrderValue;
  final double verifiedPayments;
  final double pendingPayments;
  final int lowStockCount;
  final int outOfStockCount;
  final int totalActiveProducts;
  final int totalCustomers;
  final String dateRangeLabel;

  const AnalyticsOverviewModel({
    required this.totalOrders,
    required this.ordersToday,
    required this.awaitingConfirmation,
    required this.completedOrders,
    required this.cancelledOrders,
    required this.grossOrderValue,
    required this.verifiedPayments,
    required this.pendingPayments,
    required this.lowStockCount,
    required this.outOfStockCount,
    required this.totalActiveProducts,
    required this.totalCustomers,
    required this.dateRangeLabel,
  });

  factory AnalyticsOverviewModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsOverviewModel(
      totalOrders: (json['totalOrders'] as num?)?.toInt() ?? 0,
      ordersToday: (json['ordersToday'] as num?)?.toInt() ?? 0,
      awaitingConfirmation: (json['awaitingConfirmation'] as num?)?.toInt() ?? 0,
      completedOrders: (json['completedOrders'] as num?)?.toInt() ?? 0,
      cancelledOrders: (json['cancelledOrders'] as num?)?.toInt() ?? 0,
      grossOrderValue: (json['grossOrderValue'] as num?)?.toDouble() ?? 0.0,
      verifiedPayments: (json['verifiedPayments'] as num?)?.toDouble() ?? 0.0,
      pendingPayments: (json['pendingPayments'] as num?)?.toDouble() ?? 0.0,
      lowStockCount: (json['lowStockCount'] as num?)?.toInt() ?? 0,
      outOfStockCount: (json['outOfStockCount'] as num?)?.toInt() ?? 0,
      totalActiveProducts: (json['totalActiveProducts'] as num?)?.toInt() ?? 0,
      totalCustomers: (json['totalCustomers'] as num?)?.toInt() ?? 0,
      dateRangeLabel: json['dateRange']?['label'] ?? 'Custom',
    );
  }
}

class SalesTimelinePoint {
  final String date;
  final int orderCount;
  final double grossValue;
  final double verifiedPayments;
  final double pendingPayments;

  const SalesTimelinePoint({
    required this.date,
    required this.orderCount,
    required this.grossValue,
    required this.verifiedPayments,
    required this.pendingPayments,
  });

  factory SalesTimelinePoint.fromJson(Map<String, dynamic> json) {
    return SalesTimelinePoint(
      date: json['date'] ?? '',
      orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
      grossValue: (json['grossValue'] as num?)?.toDouble() ?? 0.0,
      verifiedPayments: (json['verifiedPayments'] as num?)?.toDouble() ?? 0.0,
      pendingPayments: (json['pendingPayments'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class SalesAnalyticsModel {
  final double grossOrderValue;
  final double verifiedPayments;
  final double pendingPayments;
  final double refundTotal;
  final double averageOrderValue;
  final int eligibleOrdersCount;
  final Map<String, dynamic> paymentMethods;
  final Map<String, dynamic> fulfillmentMethods;
  final Map<String, dynamic> statusCounts;
  final List<SalesTimelinePoint> timeline;

  const SalesAnalyticsModel({
    required this.grossOrderValue,
    required this.verifiedPayments,
    required this.pendingPayments,
    required this.refundTotal,
    required this.averageOrderValue,
    required this.eligibleOrdersCount,
    required this.paymentMethods,
    required this.fulfillmentMethods,
    required this.statusCounts,
    required this.timeline,
  });

  factory SalesAnalyticsModel.fromJson(Map<String, dynamic> json) {
    final tList = (json['timeline'] as List<dynamic>?)
            ?.map((e) => SalesTimelinePoint.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return SalesAnalyticsModel(
      grossOrderValue: (json['grossOrderValue'] as num?)?.toDouble() ?? 0.0,
      verifiedPayments: (json['verifiedPayments'] as num?)?.toDouble() ?? 0.0,
      pendingPayments: (json['pendingPayments'] as num?)?.toDouble() ?? 0.0,
      refundTotal: (json['refundTotal'] as num?)?.toDouble() ?? 0.0,
      averageOrderValue: (json['averageOrderValue'] as num?)?.toDouble() ?? 0.0,
      eligibleOrdersCount: (json['eligibleOrdersCount'] as num?)?.toInt() ?? 0,
      paymentMethods: json['paymentMethods'] as Map<String, dynamic>? ?? {},
      fulfillmentMethods: json['fulfillmentMethods'] as Map<String, dynamic>? ?? {},
      statusCounts: json['statusCounts'] as Map<String, dynamic>? ?? {},
      timeline: tList,
    );
  }
}

class CustomerSummaryModel {
  final String id;
  final String name;
  final String email;
  final String phone;
  final bool isRegistered;
  final String? registeredAt;
  final int orderCount;
  final double totalSpend;
  final String? lastOrderDate;

  const CustomerSummaryModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.isRegistered,
    this.registeredAt,
    required this.orderCount,
    required this.totalSpend,
    this.lastOrderDate,
  });

  factory CustomerSummaryModel.fromJson(Map<String, dynamic> json) {
    return CustomerSummaryModel(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Customer',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      isRegistered: json['isRegistered'] == true,
      registeredAt: json['registeredAt'],
      orderCount: (json['orderCount'] as num?)?.toInt() ?? 0,
      totalSpend: (json['totalSpend'] as num?)?.toDouble() ?? 0.0,
      lastOrderDate: json['lastOrderDate'],
    );
  }
}

class AdminStoreSettingsModel {
  final String storeName;
  final String storePhone;
  final String storeWhatsapp;
  final String storeUpiId;
  final String storeAddress;
  final String? logoUrl;
  final String? supportEmail;
  final String? supportPhone;
  final String? supportHours;
  final String? operatingHours;
  final bool isPickupEnabled;
  final String pickupInstructions;
  final bool isDeliveryEnabled;
  final List<String> serviceablePincodes;
  final double minOrderValue;
  final double standardDeliveryFee;
  final double freeDeliveryThreshold;
  final String estimatedDeliveryWindow;
  final bool isCodEnabled;
  final bool isWhatsappQrEnabled;
  final String? paymentInstructions;
  final String? orderPolicies;
  final bool adminOrderAlertsEnabled;
  final bool lowStockAlertsEnabled;
  final bool customerStatusNotificationsEnabled;
  final String invoicePrefix;
  final String? gstin;
  final String? taxDetails;

  const AdminStoreSettingsModel({
    required this.storeName,
    required this.storePhone,
    required this.storeWhatsapp,
    required this.storeUpiId,
    required this.storeAddress,
    this.logoUrl,
    this.supportEmail,
    this.supportPhone,
    this.supportHours,
    this.operatingHours,
    required this.isPickupEnabled,
    required this.pickupInstructions,
    required this.isDeliveryEnabled,
    required this.serviceablePincodes,
    required this.minOrderValue,
    required this.standardDeliveryFee,
    required this.freeDeliveryThreshold,
    required this.estimatedDeliveryWindow,
    required this.isCodEnabled,
    required this.isWhatsappQrEnabled,
    this.paymentInstructions,
    this.orderPolicies,
    required this.adminOrderAlertsEnabled,
    required this.lowStockAlertsEnabled,
    required this.customerStatusNotificationsEnabled,
    required this.invoicePrefix,
    this.gstin,
    this.taxDetails,
  });

  factory AdminStoreSettingsModel.fromJson(Map<String, dynamic> json) {
    return AdminStoreSettingsModel(
      storeName: json['storeName'] ?? 'Kanhaiya General Store',
      storePhone: json['storePhone'] ?? '',
      storeWhatsapp: json['storeWhatsapp'] ?? '',
      storeUpiId: json['storeUpiId'] ?? '',
      storeAddress: json['storeAddress'] ?? '',
      logoUrl: json['logoUrl'],
      supportEmail: json['supportEmail'],
      supportPhone: json['supportPhone'],
      supportHours: json['supportHours'],
      operatingHours: json['operatingHours'],
      isPickupEnabled: json['isPickupEnabled'] ?? true,
      pickupInstructions: json['pickupInstructions'] ?? '',
      isDeliveryEnabled: json['isDeliveryEnabled'] ?? true,
      serviceablePincodes: (json['serviceablePincodes'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      minOrderValue: (json['minOrderValue'] as num?)?.toDouble() ?? 100.0,
      standardDeliveryFee: (json['standardDeliveryFee'] as num?)?.toDouble() ?? 30.0,
      freeDeliveryThreshold: (json['freeDeliveryThreshold'] as num?)?.toDouble() ?? 500.0,
      estimatedDeliveryWindow: json['estimatedDeliveryWindow'] ?? 'Same-day delivery within 2-4 hours',
      isCodEnabled: json['isCodEnabled'] ?? true,
      isWhatsappQrEnabled: json['isWhatsappQrEnabled'] ?? true,
      paymentInstructions: json['paymentInstructions'],
      orderPolicies: json['orderPolicies'],
      adminOrderAlertsEnabled: json['adminOrderAlertsEnabled'] ?? true,
      lowStockAlertsEnabled: json['lowStockAlertsEnabled'] ?? true,
      customerStatusNotificationsEnabled: json['customerStatusNotificationsEnabled'] ?? true,
      invoicePrefix: json['invoicePrefix'] ?? 'INV',
      gstin: json['gstin'],
      taxDetails: json['taxDetails'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'storeName': storeName,
      'storePhone': storePhone,
      'storeWhatsapp': storeWhatsapp,
      'storeUpiId': storeUpiId,
      'storeAddress': storeAddress,
      'logoUrl': logoUrl,
      'supportEmail': supportEmail,
      'supportPhone': supportPhone,
      'supportHours': supportHours,
      'operatingHours': operatingHours,
      'isPickupEnabled': isPickupEnabled,
      'pickupInstructions': pickupInstructions,
      'isDeliveryEnabled': isDeliveryEnabled,
      'serviceablePincodes': serviceablePincodes,
      'minOrderValue': minOrderValue,
      'standardDeliveryFee': standardDeliveryFee,
      'freeDeliveryThreshold': freeDeliveryThreshold,
      'estimatedDeliveryWindow': estimatedDeliveryWindow,
      'isCodEnabled': isCodEnabled,
      'isWhatsappQrEnabled': isWhatsappQrEnabled,
      'paymentInstructions': paymentInstructions,
      'orderPolicies': orderPolicies,
      'adminOrderAlertsEnabled': adminOrderAlertsEnabled,
      'lowStockAlertsEnabled': lowStockAlertsEnabled,
      'customerStatusNotificationsEnabled': customerStatusNotificationsEnabled,
      'invoicePrefix': invoicePrefix,
      'gstin': gstin,
      'taxDetails': taxDetails,
    };
  }
}
