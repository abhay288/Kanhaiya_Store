import '../../domain/models/category_model.dart';
import '../../domain/models/product_model.dart';
import '../../domain/models/collections_model.dart';
import '../../../cart/domain/models/cart_validation_model.dart';

abstract class CatalogRepository {
  Future<List<CategoryModel>> getCategories();
  Future<List<ProductModel>> getProducts({
    String? categoryId,
    String? search,
    String? brand,
    bool? inStock,
    String? sort,
  });
  Future<ProductModel?> getProductById(String id);
  Future<CollectionsModel> getCollections();
  Future<List<ProductModel>> getRelatedProducts(String productId);
  Future<CartValidationResponseModel> validateCart(List<Map<String, dynamic>> items);
}
