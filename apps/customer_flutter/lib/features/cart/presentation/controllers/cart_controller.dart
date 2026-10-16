import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/models/cart_item_model.dart';
import '../../domain/models/cart_validation_model.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../../catalog/presentation/controllers/catalog_providers.dart';

class CartNotifier extends Notifier<List<CartItemModel>> {
  String _currentAccountKey = 'guest';
  List<CartItemModel> _items = [];

  String _getCartStorageKey([String? userId]) {
    final key = userId ?? _currentAccountKey;
    return 'kgs_customer_cart_${key.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_')}';
  }

  @override
  List<CartItemModel> build() {
    // Watch auth user: whenever the user changes (login, logout, switch account), re-load their specific cart
    final authState = ref.watch(authProvider);
    final newAccountKey = authState.user?.id ?? authState.user?.email ?? 'guest';

    if (_currentAccountKey != newAccountKey) {
      _currentAccountKey = newAccountKey;
      _items = [];
      Future.microtask(() => _loadFromStorage());
      return [];
    }

    if (_items.isEmpty) {
      Future.microtask(() => _loadFromStorage());
    }
    return _items;
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _getCartStorageKey();
      final savedJson = prefs.getString(key);
      if (savedJson != null && savedJson.isNotEmpty) {
        final List decoded = jsonDecode(savedJson) as List;
        _items = decoded.map((i) => CartItemModel.fromJson(i as Map<String, dynamic>)).toList();
        state = _items;
      } else {
        _items = [];
        state = [];
      }
    } catch (_) {
      // ignore storage error
    }
  }

  Future<void> _persistToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = _getCartStorageKey();
      final encoded = jsonEncode(state.map((i) => i.toJson()).toList());
      await prefs.setString(key, encoded);
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
      _items = updated;
      state = updated;
    } else {
      final cappedQty = qty > product.stockQuantity ? product.stockQuantity : qty;
      _items = [...state, CartItemModel(product: product, quantity: cappedQty)];
      state = _items;
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
      _items = updated;
      state = updated;
      _persistToStorage();
    }
  }

  void removeFromCart(String productId) {
    _items = state.where((item) => item.product.id != productId).toList();
    state = _items;
    _persistToStorage();
  }

  Future<void> clearCart() async {
    _items = [];
    state = [];
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_getCartStorageKey(), '[]');
      await prefs.setString('kgs_customer_cart_guest', '[]');
      await prefs.remove(_getCartStorageKey());
      await prefs.remove('kgs_customer_cart_guest');
    } catch (_) {
      // ignore storage error
    }
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
