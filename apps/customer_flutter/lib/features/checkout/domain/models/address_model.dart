class AddressModel {
  final String id;
  final String name;
  final String phone;
  final String houseNumber;
  final String street;
  final String? landmark;
  final String city;
  final String state;
  final String pincode;
  final String? deliveryInstructions;
  final bool isDefault;

  const AddressModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.houseNumber,
    required this.street,
    this.landmark,
    required this.city,
    required this.state,
    required this.pincode,
    this.deliveryInstructions,
    this.isDefault = false,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      houseNumber: json['houseNumber'] ?? '',
      street: json['street'] ?? '',
      landmark: json['landmark'],
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      pincode: json['pincode'] ?? '',
      deliveryInstructions: json['deliveryInstructions'],
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'houseNumber': houseNumber,
      'street': street,
      if (landmark != null && landmark!.isNotEmpty) 'landmark': landmark,
      'city': city,
      'state': state,
      'pincode': pincode,
      if (deliveryInstructions != null && deliveryInstructions!.isNotEmpty)
        'deliveryInstructions': deliveryInstructions,
      'isDefault': isDefault,
    };
  }
}
