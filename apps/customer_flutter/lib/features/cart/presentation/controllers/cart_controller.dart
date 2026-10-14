import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/models/cart_item_model.dart';
import '../../domain/models/cart_validation_model.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../../catalog/presentation/controllers/catalog_providers.dart';

const String _cartPrefsKey = 'kgs_customer_cart_v1';

class CartNotifier extends Notifier<List<CartItemModel>> {
  @override
  List<CartItemModel> build() {
    _loadFromStorage();
    return [];
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedJson = prefs.getString(_cartPrefsKey);
      if (savedJson != null && savedJson.isNotEmpty) {
        final List decoded = jsonDecode(savedJson) as List;
        state = decoded.map((i) => CartItemModel.fromJson(i as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // ignore storage error
    }
  }

  Future<void> _persistToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(state.map((i) => i.toJson()).toList());
      await prefs.setString(_cartPrefsKey, encoded);
    } catch (_) {
      // ignore storage error
    }
  }

  void addToCart(ProductModel product, {int qty = 1}) {
    if (!product.inStock) return;

    final index = state.indexWhere((item) => item.product.id == product.id);
    if (index >= 0) {
      final current = state[index];
      final newQty = current.quantity + qty;
      final cappedQty = newQty > product.stockQuantity ? product.stockQuantity : newQty;
      final updated = List<CartItemModel>.from(state);
      updated[index] = current.copyWith(quantity: cappedQty);
      state = updated;
    } else {
      final cappedQty = qty > product.stockQuantity ? product.stockQuantity : qty;
      state = [...state, CartItemModel(product: product, quantity: cappedQty)];
    }
    _persistToStorage();
  }

  void updateQuantity(String productId, int newQuantity) {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    final index = state.indexWhere((item) => item.product.id == productId);
    if (index >= 0) {
      final maxStock = state[index].product.stockQuantity;
      final finalQty = newQuantity > maxStock ? maxStock : newQuantity;
      final updated = List<CartItemModel>.from(state);
      updated[index] = updated[index].copyWith(quantity: finalQty);
      state = updated;
      _persistToStorage();
    }
  }

  void removeFromCart(String productId) {
    state = state.where((item) => item.product.id != productId).toList();
    _persistToStorage();
  }

  void clearCart() {
    state = [];
    _persistToStorage();
  }

  /// Revalidates cart items with backend and adjusts quantities if stock reduced
  Future<CartValidationResponseModel?> revalidateCart() async {
    if (state.isEmpty) return null;

    try {
      final repo = ref.read(catalogRepositoryProvider);
      final payload = state.map((i) => {
        'productId': i.product.id,
        'quantity': i.quantity,
      }).toList();

      final res = await repo.validateCart(payload);

      if (res.hasAdjustments) {
        final List<CartItemModel> adjustedList = [];
        for (final item in state) {
          final serverItem = res.items.where((si) => si.productId == item.product.id).firstOrNull;
          if (serverItem == null || serverItem.validQuantity == 0) {
            continue;
          }
          adjustedList.add(item.copyWith(
            quantity: serverItem.validQuantity,
            product: ProductModel(
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              categoryId: item.product.categoryId,
              categoryName: item.product.categoryName,
              sellingPrice: serverItem.sellingPrice,
              mrp: serverItem.mrp,
              stockQuantity: serverItem.availableStock,
              unit: item.product.unit,
              packSize: item.product.packSize,
              imageUrl: item.product.imageUrl,
              brand: item.product.brand,
            ),
          ));
        }
        state = adjustedList;
        _persistToStorage();
      }
      return res;
    } catch (_) {
      return null;
    }
  }
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItemModel>>(CartNotifier.new);

final cartItemCountProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0, (sum, item) => sum + item.quantity);
});

final cartSubtotalProvider = Provider<double>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0.0, (sum, item) => sum + item.totalPrice);
});

final cartTotalMrpProvider = Provider<double>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.fold(0.0, (sum, item) => sum + item.totalMrp);
});

final cartSavingsProvider = Provider<double>((ref) {
  final subtotal = ref.watch(cartSubtotalProvider);
  final totalMrp = ref.watch(cartTotalMrpProvider);
  return totalMrp > subtotal ? totalMrp - subtotal : 0.0;
});

final cartDeliveryFeeProvider = Provider<double>((ref) {
  // Store policy: In-store pickup counter orders (Free handling)
  return 0.0;
});

final cartTotalToPayProvider = Provider<double>((ref) {
  final subtotal = ref.watch(cartSubtotalProvider);
  return subtotal;
});
