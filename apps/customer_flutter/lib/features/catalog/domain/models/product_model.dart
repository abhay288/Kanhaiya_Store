class ProductImageModel {
  final String url;
  final String publicId;
  final bool isPrimary;
  final int sortOrder;

  const ProductImageModel({
    required this.url,
    required this.publicId,
    this.isPrimary = false,
    this.sortOrder = 0,
  });

  factory ProductImageModel.fromJson(Map<String, dynamic> json) {
    return ProductImageModel(
      url: json['url'] as String? ?? '',
      publicId: json['publicId'] as String? ?? '',
      isPrimary: json['isPrimary'] as bool? ?? false,
      sortOrder: json['sortOrder'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'url': url,
      'publicId': publicId,
      'isPrimary': isPrimary,
      'sortOrder': sortOrder,
    };
  }
}

class ProductModel {
  final String id;
  final String name;
  final String slug;
  final String categoryId;
  final String categoryName;
  final String? subcategoryId;
  final String? subcategoryName;
  final String brand;
  final String sku;
  final String barcode;
  final String unit;
  final String packSize;
  final double mrp;
  final double sellingPrice;
  final int discountPercentage;
  final int stockQuantity;
  final int lowStockThreshold;
  final bool isAvailable;
  final bool isPublished;
  final bool isFeatured;
  final bool isNewArrival;
  final bool isBestseller;
  final String imageUrl;
  final List<ProductImageModel> images;
  final List<String> tags;
  final String description;
  final String? batchNumber;
  final DateTime? manufacturingDate;
  final DateTime? expiryDate;

  const ProductModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.categoryId,
    this.categoryName = 'General',
    this.subcategoryId,
    this.subcategoryName,
    this.brand = '',
    this.sku = '',
    this.barcode = '',
    this.unit = 'piece',
    this.packSize = '',
    this.mrp = 0,
    required this.sellingPrice,
    this.discountPercentage = 0,
    this.stockQuantity = 0,
    this.lowStockThreshold = 5,
    this.isAvailable = true,
    this.isPublished = true,
    this.isFeatured = false,
    this.isNewArrival = false,
    this.isBestseller = false,
    this.imageUrl = '',
    this.images = const [],
    this.tags = const [],
    this.description = '',
    this.batchNumber,
    this.manufacturingDate,
    this.expiryDate,
  });

  bool get inStock => isAvailable && stockQuantity > 0;
  bool get isLowStock => inStock && stockQuantity <= lowStockThreshold;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final imagesList = (json['images'] as List<dynamic>? ?? [])
        .map((img) => ProductImageModel.fromJson(img as Map<String, dynamic>))
        .toList();

    final tagsList = (json['tags'] as List<dynamic>? ?? [])
        .map((t) => t.toString())
        .toList();

    final mrpVal = (json['mrp'] as num?)?.toDouble() ?? 0.0;
    final sellVal = (json['sellingPrice'] as num?)?.toDouble() ?? 0.0;

    int discount = (json['discountPercentage'] as num?)?.toInt() ?? 0;
    if (discount == 0 && mrpVal > sellVal && mrpVal > 0) {
      discount = (((mrpVal - sellVal) / mrpVal) * 100).round();
    }

    String primaryImg = json['imageUrl'] as String? ?? '';
    if (primaryImg.isEmpty && imagesList.isNotEmpty) {
      final foundPrimary = imagesList.firstWhere(
        (img) => img.isPrimary,
        orElse: () => imagesList.first,
      );
      primaryImg = foundPrimary.url;
    }

    return ProductModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      categoryId: (json['categoryId'] is Map
              ? json['categoryId']['_id'] ?? json['categoryId']['id']
              : json['categoryId'] ?? '')
          .toString(),
      categoryName: json['categoryName'] as String? ??
          (json['categoryId'] is Map ? json['categoryId']['name'] : null) ??
          'General',
      subcategoryId: json['subcategoryId'] != null
          ? (json['subcategoryId'] is Map
                  ? json['subcategoryId']['_id'] ?? json['subcategoryId']['id']
                  : json['subcategoryId'])
              ?.toString()
          : null,
      subcategoryName: json['subcategoryName'] as String? ??
          (json['subcategoryId'] is Map ? json['subcategoryId']['name'] : null),
      brand: json['brand'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      barcode: json['barcode'] as String? ?? '',
      unit: json['unit'] as String? ?? 'piece',
      packSize: json['packSize'] as String? ?? '',
      mrp: mrpVal,
      sellingPrice: sellVal,
      discountPercentage: discount,
      stockQuantity: (json['stockQuantity'] as num?)?.toInt() ?? 0,
      lowStockThreshold: (json['lowStockThreshold'] as num?)?.toInt() ?? 5,
      isAvailable: json['isAvailable'] as bool? ?? true,
      isPublished: json['isPublished'] as bool? ?? true,
      isFeatured: json['isFeatured'] as bool? ?? false,
      isNewArrival: json['isNewArrival'] as bool? ?? false,
      isBestseller: json['isBestseller'] as bool? ?? false,
      imageUrl: primaryImg,
      images: imagesList,
      tags: tagsList,
      description: json['description'] as String? ?? '',
      batchNumber: json['batchNumber'] as String?,
      manufacturingDate: json['manufacturingDate'] != null ? DateTime.tryParse(json['manufacturingDate'].toString()) : null,
      expiryDate: json['expiryDate'] != null ? DateTime.tryParse(json['expiryDate'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'categoryId': categoryId,
      'categoryName': categoryName,
      'subcategoryId': subcategoryId,
      'subcategoryName': subcategoryName,
      'brand': brand,
      'sku': sku,
      'barcode': barcode,
      'unit': unit,
      'packSize': packSize,
      'mrp': mrp,
      'sellingPrice': sellingPrice,
      'discountPercentage': discountPercentage,
      'stockQuantity': stockQuantity,
      'lowStockThreshold': lowStockThreshold,
      'isAvailable': isAvailable,
      'isPublished': isPublished,
      'isFeatured': isFeatured,
      'isNewArrival': isNewArrival,
      'isBestseller': isBestseller,
      'imageUrl': imageUrl,
      'images': images.map((img) => img.toJson()).toList(),
      'tags': tags,
      'description': description,
    };
  }
}
