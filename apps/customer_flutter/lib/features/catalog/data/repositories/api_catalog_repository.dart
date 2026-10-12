import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import '../../domain/models/collections_model.dart';
import '../../../cart/domain/models/cart_validation_model.dart';
import 'catalog_repository.dart';

class ApiCatalogRepository implements CatalogRepository {
  final Dio _dio;

  ApiCatalogRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  @override
  Future<List<CategoryModel>> getCategories() async {
    final response = await _dio.get('/categories');
    final List list = response.data['data'] as List;
    return list.map((item) => CategoryModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<ProductModel>> getProducts({
    String? categoryId,
    String? search,
    String? brand,
    bool? inStock,
    String? sort,
  }) async {
    final params = <String, dynamic>{};
    if (categoryId != null && categoryId.isNotEmpty) params['categoryId'] = categoryId;
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (brand != null && brand.isNotEmpty) params['brand'] = brand;
    if (inStock == true) params['inStock'] = 'true';
    if (sort != null && sort.isNotEmpty) params['sort'] = sort;

    final response = await _dio.get(
      '/products',
      queryParameters: params,
    );
    final List list = response.data['data']['items'] as List;
    return list.map((item) => ProductModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  @override
  Future<ProductModel?> getProductById(String id) async {
    final response = await _dio.get('/products/$id');
    if (response.data['data'] == null) return null;
    return ProductModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Future<CollectionsModel> getCollections() async {
    final response = await _dio.get('/products/collections');
    if (response.data['data'] == null) return const CollectionsModel();
    return CollectionsModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Future<List<ProductModel>> getRelatedProducts(String productId) async {
    final response = await _dio.get('/products/$productId/related');
    final List list = (response.data['data'] as List?) ?? [];
    return list.map((item) => ProductModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  @override
  Future<CartValidationResponseModel> validateCart(List<Map<String, dynamic>> items) async {
    final response = await _dio.post(
      '/cart/validate',
      data: {'items': items},
    );
    if (response.data['data'] == null) return const CartValidationResponseModel();
    return CartValidationResponseModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
