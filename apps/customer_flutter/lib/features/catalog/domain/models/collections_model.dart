import 'product_model.dart';

class CollectionsModel {
  final List<ProductModel> featured;
  final List<ProductModel> newArrivals;
  final List<ProductModel> bestsellers;
  final List<ProductModel> essentials;

  const CollectionsModel({
    this.featured = const [],
    this.newArrivals = const [],
    this.bestsellers = const [],
    this.essentials = const [],
  });

  factory CollectionsModel.fromJson(Map<String, dynamic> json) {
    return CollectionsModel(
      featured: (json['featured'] as List<dynamic>? ?? [])
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList(),
      newArrivals: (json['newArrivals'] as List<dynamic>? ?? [])
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList(),
      bestsellers: (json['bestsellers'] as List<dynamic>? ?? [])
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList(),
      essentials: (json['essentials'] as List<dynamic>? ?? [])
          .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
          .toList(),
    );
  }
}
