import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/config/env_config.dart';
import '../../data/repositories/api_catalog_repository.dart';
import '../../data/repositories/catalog_repository.dart';
import '../../data/repositories/mock_catalog_repository.dart';
import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import '../../domain/models/collections_model.dart';

class CatalogVersionNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}

final catalogVersionProvider = NotifierProvider<CatalogVersionNotifier, int>(CatalogVersionNotifier.new);

final catalogRepositoryProvider = Provider<CatalogRepository>((ref) {
  if (EnvConfig.useMockRepository) {
    return MockCatalogRepository();
  }
  return ApiCatalogRepository();
});

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) async {
  ref.watch(catalogVersionProvider);
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getCategories();
});

final collectionsProvider = FutureProvider<CollectionsModel>((ref) async {
  ref.watch(catalogVersionProvider);
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getCollections();
});

final relatedProductsProvider = FutureProvider.family<List<ProductModel>, String>((ref, productId) async {
  ref.watch(catalogVersionProvider);
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getRelatedProducts(productId);
});

class ProductFilter {
  final String? categoryId;
  final String? search;
  final String? brand;
  final bool? inStock;
  final String? sort;

  const ProductFilter({
    this.categoryId,
    this.search,
    this.brand,
    this.inStock,
    this.sort,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProductFilter &&
          runtimeType == other.runtimeType &&
          categoryId == other.categoryId &&
          search == other.search &&
          brand == other.brand &&
          inStock == other.inStock &&
          sort == other.sort;

  @override
  int get hashCode =>
      categoryId.hashCode ^
      search.hashCode ^
      brand.hashCode ^
      inStock.hashCode ^
      sort.hashCode;
}

final productsProvider = FutureProvider.family<List<ProductModel>, ProductFilter>((ref, filter) async {
  ref.watch(catalogVersionProvider);
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getProducts(
    categoryId: filter.categoryId,
    search: filter.search,
    brand: filter.brand,
    inStock: filter.inStock,
    sort: filter.sort,
  );
});
