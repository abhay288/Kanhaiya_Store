import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import '../../domain/models/collections_model.dart';
import '../../../cart/domain/models/cart_validation_model.dart';
import 'catalog_repository.dart';

class MockCatalogRepository implements CatalogRepository {
  static const List<CategoryModel> _mockCategories = [
    CategoryModel(id: 'cat-1', name: 'Atta, Flours & Sooji', slug: 'atta-flours', icon: '🌾', itemCount: 18),
    CategoryModel(id: 'cat-2', name: 'Rice & Grains', slug: 'rice-grains', icon: '🍚', itemCount: 24),
    CategoryModel(id: 'cat-3', name: 'Dals & Pulses', slug: 'dals-pulses', icon: '🥣', itemCount: 32),
    CategoryModel(id: 'cat-4', name: 'Oils & Ghee', slug: 'oils-ghee', icon: '🫒', itemCount: 15),
    CategoryModel(id: 'cat-5', name: 'Spices & Masalas', slug: 'spices-masalas', icon: '🌶️', itemCount: 40),
    CategoryModel(id: 'cat-6', name: 'Milk Products & Breads', slug: 'milk-breads', icon: '🥛', itemCount: 16),
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
      brand: 'Aashirvaad',
      unit: '5 kg',
      mrp: 295.0,
      sellingPrice: 265.0,
      stockQuantity: 42,
      isAvailable: true,
      isFeatured: true,
      isBestseller: true,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
      description: '100% pure whole wheat flour processed with superior 40-step process for soft, fluffy rotis.',
    ),
    ProductModel(
      id: 'prod-2',
      name: 'Fortune Sunlite Refined Sunflower Oil',
      slug: 'fortune-sunflower-oil-1l',
      categoryId: 'cat-4',
      categoryName: 'Oils & Ghee',
      brand: 'Fortune',
      unit: '1 L Pouch',
      mrp: 165.0,
      sellingPrice: 142.0,
      stockQuantity: 30,
      isAvailable: true,
      isNewArrival: true,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
      description: 'Light and healthy refined sunflower oil enriched with vitamins A & D for everyday healthy cooking.',
    ),
    ProductModel(
      id: 'prod-3',
      name: 'Tata Sampann Unpolished Toor Dal',
      slug: 'tata-sampann-toor-dal-1kg',
      categoryId: 'cat-3',
      categoryName: 'Dals & Pulses',
      brand: 'Tata Sampann',
      unit: '1 kg',
      mrp: 198.0,
      sellingPrice: 178.0,
      stockQuantity: 25,
      isAvailable: true,
      isFeatured: true,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
      description: 'Unpolished Arhar / Toor Dal retaining natural taste, dietary fiber and rich plant protein.',
    ),
    ProductModel(
      id: 'prod-4',
      name: 'India Gate Basmati Rice Feast Rozzana',
      slug: 'india-gate-rozzana-5kg',
      categoryId: 'cat-2',
      categoryName: 'Rice & Grains',
      brand: 'India Gate',
      unit: '5 kg',
      mrp: 460.0,
      sellingPrice: 385.0,
      stockQuantity: 18,
      isAvailable: true,
      isBestseller: true,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
      description: 'Aromatic medium slender grains ideal for everyday fragrant rice and pulav preparations.',
    ),
    ProductModel(
      id: 'prod-5',
      name: 'Amul Pure Cow Ghee',
      slug: 'amul-cow-ghee-1l',
      categoryId: 'cat-4',
      categoryName: 'Oils & Ghee',
      brand: 'Amul',
      unit: '1 L Tin',
      mrp: 650.0,
      sellingPrice: 615.0,
      stockQuantity: 12,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
      description: 'Traditional granular aromatic pure cow ghee made from fresh milk cream.',
    ),
  ];

  @override
  Future<List<CategoryModel>> getCategories() async {
    await Future.delayed(const Duration(milliseconds: 100));
    return _mockCategories;
  }

  @override
  Future<List<ProductModel>> getProducts({
    String? categoryId,
    String? search,
    String? brand,
    bool? inStock,
    String? sort,
  }) async {
    await Future.delayed(const Duration(milliseconds: 100));
    var items = List<ProductModel>.from(_mockProducts);
    if (categoryId != null && categoryId.isNotEmpty) {
      items = items.where((p) => p.categoryId == categoryId).toList();
    }
    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      items = items.where((p) => p.name.toLowerCase().contains(q) || p.categoryName.toLowerCase().contains(q) || p.brand.toLowerCase().contains(q)).toList();
    }
    if (brand != null && brand.isNotEmpty) {
      items = items.where((p) => p.brand.toLowerCase() == brand.toLowerCase()).toList();
    }
    if (inStock == true) {
      items = items.where((p) => p.inStock).toList();
    }
    if (sort == 'price_asc') {
      items.sort((a, b) => a.sellingPrice.compareTo(b.sellingPrice));
    } else if (sort == 'price_desc') {
      items.sort((a, b) => b.sellingPrice.compareTo(a.sellingPrice));
    } else if (sort == 'name_asc') {
      items.sort((a, b) => a.name.compareTo(b.name));
    }
    return items;
  }

  @override
  Future<ProductModel?> getProductById(String id) async {
    await Future.delayed(const Duration(milliseconds: 50));
    try {
      return _mockProducts.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<CollectionsModel> getCollections() async {
    await Future.delayed(const Duration(milliseconds: 100));
    return CollectionsModel(
      featured: _mockProducts.where((p) => p.isFeatured).toList(),
      newArrivals: _mockProducts.where((p) => p.isNewArrival).toList(),
      bestsellers: _mockProducts.where((p) => p.isBestseller).toList(),
      essentials: _mockProducts.take(4).toList(),
    );
  }

  @override
  Future<List<ProductModel>> getRelatedProducts(String productId) async {
    await Future.delayed(const Duration(milliseconds: 50));
    return _mockProducts.where((p) => p.id != productId).take(4).toList();
  }

  @override
  Future<CartValidationResponseModel> validateCart(List<Map<String, dynamic>> items) async {
    await Future.delayed(const Duration(milliseconds: 50));
    final validated = items.map((i) {
      final id = i['productId']?.toString() ?? '';
      final qty = (i['quantity'] as num?)?.toInt() ?? 1;
      final prod = _mockProducts.where((p) => p.id == id).firstOrNull;
      final price = prod?.sellingPrice ?? 100.0;
      final mrp = prod?.mrp ?? 120.0;
      return ValidatedCartItemModel(
        productId: id,
        name: prod?.name ?? 'Grocery Item',
        brand: prod?.brand ?? '',
        imageUrl: prod?.imageUrl ?? '',
        unit: prod?.unit ?? 'piece',
        packSize: prod?.packSize ?? '',
        sellingPrice: price,
        mrp: mrp,
        requestedQuantity: qty,
        validQuantity: qty,
        availableStock: prod?.stockQuantity ?? 10,
        lineSubtotal: price * qty,
        lineMrpTotal: mrp * qty,
        status: 'valid',
      );
    }).toList();

    final subtotal = validated.fold(0.0, (s, i) => s + i.lineSubtotal);
    final totalMrp = validated.fold(0.0, (s, i) => s + i.lineMrpTotal);
    final deliveryFee = 0.0;

    return CartValidationResponseModel(
      isValid: true,
      hasAdjustments: false,
      items: validated,
      subtotal: subtotal,
      totalMrp: totalMrp,
      savings: totalMrp > subtotal ? totalMrp - subtotal : 0.0,
      deliveryFee: deliveryFee,
      totalToPay: subtotal,
      itemCount: validated.fold(0, (s, i) => s + i.validQuantity),
    );
  }
}
