import 'package:flutter/material.dart';

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

  IconData get iconData {
    switch (slug) {
      case 'atta-flours':
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
      default:
        return Icons.category_outlined;
    }
  }

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      icon: json['icon'] as String? ?? 'grain',
      itemCount: json['itemCount'] as int? ?? 0,
    );
  }
}
