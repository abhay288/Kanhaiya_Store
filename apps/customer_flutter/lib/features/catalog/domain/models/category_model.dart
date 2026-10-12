import 'package:flutter/material.dart';

class CategoryModel {
  final String id;
  final String name;
  final String slug;
  final String description;
  final String icon;
  final String imageUrl;
  final String imagePublicId;
  final int displayOrder;
  final bool isActive;
  final String? parentId;
  final int itemCount;

  const CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    this.description = '',
    this.icon = '',
    this.imageUrl = '',
    this.imagePublicId = '',
    this.displayOrder = 0,
    this.isActive = true,
    this.parentId,
    this.itemCount = 0,
  });

  IconData get iconData {
    switch (slug) {
      case 'atta-flours':
      case 'atta-flours-sooji':
        return Icons.bakery_dining_outlined;
      case 'rice-grains':
        return Icons.grain_outlined;
      case 'dals-pulses':
        return Icons.eco_outlined;
      case 'oils-ghee':
        return Icons.opacity_outlined;
      case 'spices-masalas':
        return Icons.local_fire_department_outlined;
      case 'dairy':
        return Icons.local_drink_outlined;
      case 'snacks':
        return Icons.cookie_outlined;
      case 'cleaning':
        return Icons.cleaning_services_outlined;
      case 'personal-care':
        return Icons.face_outlined;
      default:
        return Icons.category_outlined;
    }
  }

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      description: json['description'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
      imagePublicId: json['imagePublicId'] as String? ?? '',
      displayOrder: json['displayOrder'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      parentId: json['parentId'] as String?,
      itemCount: json['productCount'] as int? ?? json['itemCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'imageUrl': imageUrl,
      'imagePublicId': imagePublicId,
      'displayOrder': displayOrder,
      'isActive': isActive,
      'parentId': parentId,
      'productCount': itemCount,
    };
  }

  CategoryModel copyWith({
    String? id,
    String? name,
    String? slug,
    String? description,
    String? imageUrl,
    String? imagePublicId,
    int? displayOrder,
    bool? isActive,
    String? parentId,
    int? itemCount,
  }) {
    return CategoryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      imagePublicId: imagePublicId ?? this.imagePublicId,
      displayOrder: displayOrder ?? this.displayOrder,
      isActive: isActive ?? this.isActive,
      parentId: parentId ?? this.parentId,
      itemCount: itemCount ?? this.itemCount,
    );
  }
}
