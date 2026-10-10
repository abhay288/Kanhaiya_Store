import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';

abstract class CatalogRepository {
  Future<List<CategoryModel>> getCategories();
  Future<List<ProductModel>> getProducts({String? categoryId, String? search});
  Future<ProductModel?> getProductById(String id);
}
