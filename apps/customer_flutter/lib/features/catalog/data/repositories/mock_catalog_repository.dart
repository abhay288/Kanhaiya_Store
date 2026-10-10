import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import 'catalog_repository.dart';

class MockCatalogRepository implements CatalogRepository {
  static const List<CategoryModel> _mockCategories = [
    CategoryModel(id: 'cat-1', name: 'Atta, Flours & Sooji', slug: 'atta-flours', icon: '🌾', itemCount: 18),
    CategoryModel(id: 'cat-2', name: 'Rice & Grains', slug: 'rice-grains', icon: '🍚', itemCount: 24),
    CategoryModel(id: 'cat-3', name: 'Dals & Pulses', slug: 'dals-pulses', icon: '🥣', itemCount: 32),
    CategoryModel(id: 'cat-4', name: 'Oils & Ghee', slug: 'oils-ghee', icon: '🫒', itemCount: 15),
    CategoryModel(id: 'cat-5', name: 'Spices & Masalas', slug: 'spices-masalas', icon: '🌶️', itemCount: 40),
    CategoryModel(id: 'cat-6', name: 'Dairy & Fresh Paneer', slug: 'dairy', icon: '🥛', itemCount: 12),
    CategoryModel(id: 'cat-7', name: 'Snacks & Biscuits', slug: 'snacks', icon: '🍪', itemCount: 28),
    CategoryModel(id: 'cat-8', name: 'Cleaning & Essentials', slug: 'cleaning', icon: '🧼', itemCount: 20),
  ];

  static const List<ProductModel> _mockProducts = [
    ProductModel(
      id: 'prod-1',
      name: 'Aashirvaad Shudh Chakki Atta',
      slug: 'aashirvaad-atta-5kg',
      categoryId: 'cat-1',
      categoryName: 'Atta, Flours & Sooji',
      unit: '5 kg',
      mrp: 295.0,
      sellingPrice: 265.0,
      stockQuantity: 42,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
      description: '100% pure whole wheat flour processed with superior 40-step process for soft, fluffy rotis.',
    ),
    ProductModel(
      id: 'prod-2',
      name: 'Fortune Sunlite Refined Sunflower Oil',
      slug: 'fortune-sunflower-oil-1l',
      categoryId: 'cat-4',
      categoryName: 'Oils & Ghee',
      unit: '1 L Pouch',
      mrp: 165.0,
      sellingPrice: 142.0,
      stockQuantity: 30,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
      description: 'Light and healthy refined sunflower oil enriched with vitamins A & D for everyday healthy cooking.',
    ),
    ProductModel(
      id: 'prod-3',
      name: 'Tata Sampann Unpolished Toor Dal',
      slug: 'tata-sampann-toor-dal-1kg',
      categoryId: 'cat-3',
      categoryName: 'Dals & Pulses',
      unit: '1 kg',
      mrp: 198.0,
      sellingPrice: 178.0,
      stockQuantity: 25,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
      description: 'Unpolished Arhar / Toor Dal retaining natural taste, dietary fiber and rich plant protein.',
    ),
    ProductModel(
      id: 'prod-4',
      name: 'India Gate Basmati Rice Feast Rozzana',
      slug: 'india-gate-rozzana-5kg',
      categoryId: 'cat-2',
      categoryName: 'Rice & Grains',
      unit: '5 kg',
      mrp: 460.0,
      sellingPrice: 385.0,
      stockQuantity: 18,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
      description: 'Aromatic medium slender grains ideal for everyday fragrant rice and pulav preparations.',
    ),
    ProductModel(
      id: 'prod-5',
      name: 'Amul Pure Cow Ghee',
      slug: 'amul-cow-ghee-1l',
      categoryId: 'cat-4',
      categoryName: 'Oils & Ghee',
      unit: '1 L Tin',
      mrp: 650.0,
      sellingPrice: 615.0,
      stockQuantity: 12,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
      description: 'Traditional granular aromatic pure cow ghee made from fresh milk cream.',
    ),
    ProductModel(
      id: 'prod-6',
      name: 'Tata Salt Vaccum Evaporated Iodised Salt',
      slug: 'tata-salt-1kg',
      categoryId: 'cat-5',
      categoryName: 'Spices & Masalas',
      unit: '1 kg',
      mrp: 28.0,
      sellingPrice: 26.0,
      stockQuantity: 90,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=500&q=80',
      description: 'Desh Ka Namak — purity and essential iodine guarantee for family health.',
    ),
    ProductModel(
      id: 'prod-7',
      name: 'Wagh Bakri Premium Leaf Tea',
      slug: 'wagh-bakri-tea-500g',
      categoryId: 'cat-7',
      categoryName: 'Snacks & Biscuits',
      unit: '500 g',
      mrp: 290.0,
      sellingPrice: 265.0,
      stockQuantity: 22,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
      description: 'Rich blend of premium Assam tea leaves delivering strong flavor and inviting golden color.',
    ),
    ProductModel(
      id: 'prod-8',
      name: 'Surf Excel Quick Wash Detergent Powder',
      slug: 'surf-excel-quick-wash-1kg',
      categoryId: 'cat-8',
      categoryName: 'Cleaning & Essentials',
      unit: '1 kg',
      mrp: 155.0,
      sellingPrice: 139.0,
      stockQuantity: 35,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=500&q=80',
      description: 'Combines the power of stain-removing ingredients with gentle fabric protection.',
    ),
  ];

  @override
  Future<List<CategoryModel>> getCategories() async {
    await Future.delayed(const Duration(milliseconds: 150));
    return _mockCategories;
  }

  @override
  Future<List<ProductModel>> getProducts({String? categoryId, String? search}) async {
    await Future.delayed(const Duration(milliseconds: 200));
    var items = List<ProductModel>.from(_mockProducts);
    if (categoryId != null && categoryId.isNotEmpty) {
      items = items.where((p) => p.categoryId == categoryId).toList();
    }
    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      items = items.where((p) => p.name.toLowerCase().contains(q) || p.categoryName.toLowerCase().contains(q)).toList();
    }
    return items;
  }

  @override
  Future<ProductModel?> getProductById(String id) async {
    await Future.delayed(const Duration(milliseconds: 100));
    try {
      return _mockProducts.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }
}
