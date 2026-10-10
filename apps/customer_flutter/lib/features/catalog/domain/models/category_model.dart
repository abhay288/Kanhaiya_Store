class CategoryModel {
  final String id;
  final String name;
  final String slug;
  final String icon;
  final int itemCount;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.icon,
    required this.itemCount,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      icon: json['icon'] as String? ?? '🌾',
      itemCount: json['itemCount'] as int? ?? 0,
    );
  }
}
