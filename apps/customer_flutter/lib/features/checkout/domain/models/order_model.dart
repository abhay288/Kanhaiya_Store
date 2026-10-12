class OrderItemModel {
  final String productId;
  final String name;
  final String? brand;
  final String? imageUrl;
  final String unit;
  final String? packSize;
  final double sellingPrice;
  final double mrp;
  final int quantity;
  final double lineSubtotal;

  const OrderItemModel({
    required this.productId,
    required this.name,
    this.brand,
    this.imageUrl,
    required this.unit,
    this.packSize,
    required this.sellingPrice,
    required this.mrp,
    required this.quantity,
    required this.lineSubtotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      productId: json['productId']?.toString() ?? '',
      name: json['name'] ?? '',
      brand: json['brand'],
      imageUrl: json['imageUrl'],
      unit: json['unit'] ?? 'piece',
      packSize: json['packSize'],
      sellingPrice: (json['sellingPrice'] as num?)?.toDouble() ?? 0.0,
      mrp: (json['mrp'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      lineSubtotal: (json['lineSubtotal'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class OrderDeliveryAddressModel {
  final String name;
  final String phone;
  final String houseNumber;
  final String street;
  final String? landmark;
  final String city;
  final String state;
  final String pincode;
  final String? deliveryInstructions;

  const OrderDeliveryAddressModel({
    required this.name,
    required this.phone,
    required this.houseNumber,
    required this.street,
    this.landmark,
    required this.city,
    required this.state,
    required this.pincode,
    this.deliveryInstructions,
  });

  factory OrderDeliveryAddressModel.fromJson(Map<String, dynamic> json) {
    return OrderDeliveryAddressModel(
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      houseNumber: json['houseNumber'] ?? '',
      street: json['street'] ?? '',
      landmark: json['landmark'],
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      pincode: json['pincode'] ?? '',
      deliveryInstructions: json['deliveryInstructions'],
    );
  }
}

class OrderPickupDetailsModel {
  final String storeName;
  final String storeAddress;
  final String storePhone;
  final String pickupInstructions;

  const OrderPickupDetailsModel({
    required this.storeName,
    required this.storeAddress,
    required this.storePhone,
    required this.pickupInstructions,
  });

  factory OrderPickupDetailsModel.fromJson(Map<String, dynamic> json) {
    return OrderPickupDetailsModel(
      storeName: json['storeName'] ?? '',
      storeAddress: json['storeAddress'] ?? '',
      storePhone: json['storePhone'] ?? '',
      pickupInstructions: json['pickupInstructions'] ?? '',
    );
  }
}

class OrderAuditEntryModel {
  final String action;
  final String? fromStatus;
  final String? toStatus;
  final String? performedBy;
  final String? note;
  final DateTime timestamp;

  const OrderAuditEntryModel({
    required this.action,
    this.fromStatus,
    this.toStatus,
    this.performedBy,
    this.note,
    required this.timestamp,
  });

  factory OrderAuditEntryModel.fromJson(Map<String, dynamic> json) {
    return OrderAuditEntryModel(
      action: json['action'] ?? '',
      fromStatus: json['fromStatus'],
      toStatus: json['toStatus'],
      performedBy: json['performedBy'],
      note: json['note'],
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class CustomerOrderModel {
  final String id;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String fulfillmentMethod;
  final OrderDeliveryAddressModel? deliveryAddress;
  final OrderPickupDetailsModel? pickupDetails;
  final List<OrderItemModel> items;
  final double subtotal;
  final double deliveryFee;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus;
  final String? customerNotes;
  final String? whatsappPaymentUrl;
  final String? invoiceNumber;
  final String? cancelReason;
  final String? paymentReference;
  final String? guestTrackingToken;
  final List<OrderAuditEntryModel> statusHistory;
  final DateTime createdAt;

  const CustomerOrderModel({
    required this.id,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    required this.fulfillmentMethod,
    this.deliveryAddress,
    this.pickupDetails,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.totalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    this.customerNotes,
    this.whatsappPaymentUrl,
    this.invoiceNumber,
    this.cancelReason,
    this.paymentReference,
    this.guestTrackingToken,
    this.statusHistory = const [],
    required this.createdAt,
  });

  factory CustomerOrderModel.fromJson(Map<String, dynamic> json) {
    return CustomerOrderModel(
      id: json['_id'] ?? json['id'] ?? '',
      orderNumber: json['orderNumber'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      customerEmail: json['customerEmail'],
      fulfillmentMethod: json['fulfillmentMethod'] ?? 'DELIVERY',
      deliveryAddress: json['deliveryAddress'] != null
          ? OrderDeliveryAddressModel.fromJson(
              json['deliveryAddress'] as Map<String, dynamic>)
          : null,
      pickupDetails: json['pickupDetails'] != null
          ? OrderPickupDetailsModel.fromJson(
              json['pickupDetails'] as Map<String, dynamic>)
          : null,
      items: (json['items'] as List<dynamic>?)
              ?.map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>))
              .toList() ??
          [],
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0.0,
      deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? 'COD',
      paymentStatus: json['paymentStatus'] ?? 'PENDING',
      orderStatus: json['orderStatus'] ?? 'PLACED',
      customerNotes: json['customerNotes'],
      whatsappPaymentUrl: json['whatsappPaymentUrl'],
      invoiceNumber: json['invoiceNumber'],
      cancelReason: json['cancelReason'],
      paymentReference: json['paymentReference'],
      guestTrackingToken: json['guestTrackingToken'],
      statusHistory: (json['statusHistory'] as List<dynamic>?)
              ?.map((i) => OrderAuditEntryModel.fromJson(i as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
