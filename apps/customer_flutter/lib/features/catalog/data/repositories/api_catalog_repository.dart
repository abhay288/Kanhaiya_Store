import 'package:dio/dio.dart';
import '../../../../core/config/env_config.dart';
import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import 'catalog_repository.dart';

class ApiCatalogRepository implements CatalogRepository {
  final Dio _dio;

  ApiCatalogRepository({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: EnvConfig.apiBaseUrl,
                connectTimeout: const Duration(seconds: 5),
                receiveTimeout: const Duration(seconds: 5),
              ),
            );

  @override
  Future<List<CategoryModel>> getCategories() async {
    final response = await _dio.get('/categories');
    final List list = response.data['data'] as List;
    return list.map((item) => CategoryModel.fromJson(item as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<ProductModel>> getProducts({String? categoryId, String? search}) async {
    final params = <String, dynamic>{};
    if (categoryId != null) params['categoryId'] = categoryId;
    if (search != null) params['search'] = search;
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
}
