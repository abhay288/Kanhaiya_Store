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

  /// High-resolution, real grocery photography mapped precisely to category name & slug
  String get realImageUrl {
    if (imageUrl.isNotEmpty && imageUrl.startsWith('http')) {
      return imageUrl;
    }
    final lowerName = name.toLowerCase();
    final lowerSlug = slug.toLowerCase();

    // 1. Atta, Flours & Sooji (Golden wheat grains & fresh chakki ground wheat flour)
    if (lowerName.contains('atta') || lowerName.contains('flour') || lowerSlug.contains('atta')) {
      return 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80';
    }
    // 2. Rice & Grains (Authentic aromatic basmati rice & cereal grains)
    if (lowerName.contains('rice') || lowerName.contains('grain') || lowerSlug.contains('rice')) {
      return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80';
    }
    // 3. Dals & Pulses (Real Indian lentils - Toor, Moong, Chana dal)
    if (lowerName.contains('dal') || lowerName.contains('pulse') || lowerSlug.contains('dal')) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80';
    }
    // 4. Edible Oils & Pure Desi Ghee (Traditional golden mustard oil & cow ghee in jar)
    if (lowerName.contains('oil') || lowerName.contains('ghee') || lowerSlug.contains('oil') || lowerSlug.contains('ghee')) {
      return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80';
    }
    // 5. Spices & Masalas (Rich Indian whole spices, cloves, cardamom, turmeric, red chilli)
    if (lowerName.contains('spice') || lowerName.contains('masala') || lowerSlug.contains('spice')) {
      return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80';
    }
    // 6. Snacks & Biscuits (Crispy tea biscuits, namkeen, cookies & snacks)
    if (lowerName.contains('snack') || lowerName.contains('biscuit') || lowerSlug.contains('snack')) {
      return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80';
    }
    // 7. Cleaning & Household Essentials (Detergents, laundry essentials, cleaner bottles)
    if (lowerName.contains('clean') || lowerName.contains('household') || lowerSlug.contains('clean')) {
      return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80';
    }
    // 8. Personal Care (Soap, shampoo, skincare & personal hygiene products)
    if (lowerName.contains('personal') || lowerName.contains('care') || lowerSlug.contains('personal')) {
      return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80';
    }
    // 9. Dairy & Bakery (Fresh milk, butter & dairy goods)
    if (lowerName.contains('dairy') || lowerName.contains('milk') || lowerName.contains('bakery')) {
      return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80';
    }

    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  }

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
