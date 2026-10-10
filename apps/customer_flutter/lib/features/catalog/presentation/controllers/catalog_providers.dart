import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/env_config.dart';
import '../../data/repositories/api_catalog_repository.dart';
import '../../data/repositories/catalog_repository.dart';
import '../../data/repositories/mock_catalog_repository.dart';
import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  if (EnvConfig.useMockRepository) {
    return MockCatalogRepository();
  }
  return ApiCatalogRepository();
});

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getCategories();
});

class ProductFilter {
  final String? categoryId;
  final String? search;

  const ProductFilter({this.categoryId, this.search});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProductFilter &&
          runtimeType == other.runtimeType &&
          categoryId == other.categoryId &&
          search == other.search;

  @override
  int get hashCode => categoryId.hashCode ^ search.hashCode;
}

final productsProvider = FutureProvider.family<List<ProductModel>, ProductFilter>((ref, filter) async {
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getProducts(categoryId: filter.categoryId, search: filter.search);
});
