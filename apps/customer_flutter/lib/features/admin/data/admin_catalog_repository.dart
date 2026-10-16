import 'dart:async';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../catalog/domain/models/category_model.dart';
import '../../catalog/domain/models/product_model.dart';

final StreamController<void> catalogUpdateStream = StreamController<void>.broadcast();

void notifyCatalogUpdated() {
  catalogUpdateStream.add(null);
}

class AdminCatalogRepository {
  final Dio _dio;

  AdminCatalogRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetch all categories including inactive ones
  Future<List<CategoryModel>> getCategories({bool includeInactive = true, String? search}) async {
    final params = <String, dynamic>{
      if (includeInactive) 'includeInactive': 'true',
      if (search != null && search.isNotEmpty) 'search': search,
    };
    final response = await _dio.get('/categories', queryParameters: params);
    final List list = response.data['data'] as List;
    return list.map((item) => CategoryModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  /// Create a new category
  Future<CategoryModel> createCategory(Map<String, dynamic> data) async {
    final response = await _dio.post('/categories', data: data);
    notifyCatalogUpdated();
    return CategoryModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Update an existing category
  Future<CategoryModel> updateCategory(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/categories/$id', data: data);
    notifyCatalogUpdated();
    return CategoryModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Delete a category
  Future<void> deleteCategory(String id) async {
    await _dio.delete('/categories/$id');
    notifyCatalogUpdated();
  }

  /// Upload an image to Cloudinary via backend server
  Future<Map<String, dynamic>> uploadImageBytes(
    Uint8List bytes,
    String fileName, {
    String folder = 'kanhaiya_store/products',
  }) async {
    final formData = FormData.fromMap({
      'folder': folder,
      'image': MultipartFile.fromBytes(
        bytes,
        filename: fileName,
      ),
    });

    final response = await _dio.post(
      '/admin/upload',
      data: formData,
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  /// Delete an image from Cloudinary
  Future<void> deleteImage(String publicId) async {
    final encoded = Uri.encodeComponent(publicId);
    await _dio.delete('/admin/upload/$encoded');
  }

  /// Fetch paginated products for admin
  Future<Map<String, dynamic>> getProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? categoryId,
    String? isPublished,
    String? inStock,
    String? sort = 'newest',
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (search != null && search.isNotEmpty) 'search': search,
      if (categoryId != null && categoryId.isNotEmpty) 'categoryId': categoryId,
      if (isPublished != null && isPublished.isNotEmpty) 'isPublished': isPublished,
      if (inStock != null && inStock.isNotEmpty) 'inStock': inStock,
      if (sort != null && sort.isNotEmpty) 'sort': sort,
    };

    final response = await _dio.get('/products', queryParameters: params);
    final data = response.data['data'] as Map<String, dynamic>;
    final List list = (data['items'] ?? data['products'] ?? []) as List;
    final products = list
        .map((item) => item is ProductModel ? item : ProductModel.fromJson(item as Map<String, dynamic>))
        .toList();

    return {
      'items': products,
      'products': products,
      'total': data['total'] as int? ?? products.length,
      'page': data['page'] as int? ?? 1,
      'totalPages': data['totalPages'] as int? ?? 1,
    };
  }

  /// Get single product details
  Future<ProductModel> getProductById(String id) async {
    final response = await _dio.get('/products/$id');
    return ProductModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Create product
  Future<ProductModel> createProduct(Map<String, dynamic> data) async {
    final response = await _dio.post('/products', data: data);
    notifyCatalogUpdated();
    return ProductModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Update product
  Future<ProductModel> updateProduct(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/products/$id', data: data);
    notifyCatalogUpdated();
    return ProductModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Toggle product publication
  Future<void> togglePublish(String id, bool isPublished) async {
    await _dio.patch('/products/$id/publish', data: {'isPublished': isPublished});
    notifyCatalogUpdated();
  }

  /// Delete product
  Future<void> deleteProduct(String id) async {
    await _dio.delete('/products/$id');
    notifyCatalogUpdated();
  }
}

final adminCatalogRepository = AdminCatalogRepository();
