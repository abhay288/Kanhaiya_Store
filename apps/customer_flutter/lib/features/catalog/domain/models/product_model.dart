class ProductModel {
  final String id;
  final String name;
  final String slug;
  final String categoryId;
  final String categoryName;
  final String unit;
  final double mrp;
  final double sellingPrice;
  final int stockQuantity;
  final bool isAvailable;
  final String imageUrl;
  final String description;

  const ProductModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.categoryId,
    required this.categoryName,
    required this.unit,
    required this.mrp,
    required this.sellingPrice,
    required this.stockQuantity,
    required this.isAvailable,
    required this.imageUrl,
    required this.description,
  });

  bool get inStock => isAvailable && stockQuantity > 0;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      categoryId: json['categoryId'] as String,
      categoryName: json['categoryName'] as String? ?? 'General',
      unit: json['unit'] as String,
      mrp: (json['mrp'] as num).toDouble(),
      sellingPrice: (json['sellingPrice'] as num).toDouble(),
      stockQuantity: json['stockQuantity'] as int,
      isAvailable: json['isAvailable'] as bool? ?? true,
      imageUrl: json['imageUrl'] as String? ?? '',
      description: json['description'] as String? ?? '',
    );
  }
}
