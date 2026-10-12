import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:customer_flutter/features/catalog/domain/models/product_model.dart';
import 'package:customer_flutter/features/catalog/domain/models/collections_model.dart';
import 'package:customer_flutter/features/cart/domain/models/cart_item_model.dart';
import 'package:customer_flutter/features/cart/domain/models/cart_validation_model.dart';
import 'package:customer_flutter/features/cart/presentation/controllers/cart_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Phase 5: Customer Shopping & Cart Experience Suite', () {
    const testProduct1 = ProductModel(
      id: 'prod-atta-5kg',
      name: 'Aashirvaad Shudh Chakki Atta',
      slug: 'aashirvaad-atta-5kg',
      categoryId: 'cat-flours',
      categoryName: 'Flours & Grains',
      brand: 'Aashirvaad',
      unit: '5 kg',
      mrp: 295.0,
      sellingPrice: 265.0,
      stockQuantity: 5,
      isAvailable: true,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/atta.webp',
    );

    const testProduct2 = ProductModel(
      id: 'prod-oil-1l',
      name: 'Fortune Sunlite Refined Oil',
      slug: 'fortune-oil-1l',
      categoryId: 'cat-oils',
      categoryName: 'Oils & Ghee',
      brand: 'Fortune',
      unit: '1 L',
      mrp: 165.0,
      sellingPrice: 140.0,
      stockQuantity: 2,
      isAvailable: true,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/oil.webp',
    );

    const outOfStockProduct = ProductModel(
      id: 'prod-oos',
      name: 'Sold Out Item',
      slug: 'sold-out-item',
      categoryId: 'cat-flours',
      sellingPrice: 100.0,
      stockQuantity: 0,
      isAvailable: false,
    );

    test('CartItemModel serialization and deserialization', () {
      const item = CartItemModel(product: testProduct1, quantity: 2);
      expect(item.totalPrice, 530.0);
      expect(item.totalMrp, 590.0);

      final json = item.toJson();
      final restored = CartItemModel.fromJson(json);

      expect(restored.product.id, 'prod-atta-5kg');
      expect(restored.quantity, 2);
      expect(restored.totalPrice, 530.0);
    });

    test('CartNotifier should prevent adding out of stock products', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      notifier.addToCart(outOfStockProduct);

      final cart = container.read(cartProvider);
      expect(cart.isEmpty, isTrue);
    });

    test('CartNotifier should cap addition at available stockQuantity', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      // testProduct2 only has 2 in stock
      notifier.addToCart(testProduct2, qty: 10);

      final cart = container.read(cartProvider);
      expect(cart.length, 1);
      expect(cart[0].quantity, 2); // Capped to 2
    });

    test('CartNotifier updates quantities and computes correct subtotal and delivery fee', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(cartProvider.notifier);
      notifier.addToCart(testProduct1, qty: 1); // 265.0

      expect(container.read(cartItemCountProvider), 1);
      expect(container.read(cartSubtotalProvider), 265.0);
      expect(container.read(cartDeliveryFeeProvider), 0.0); // Store policy: In-store pickup only (0 fee)
      expect(container.read(cartTotalToPayProvider), 265.0);
      expect(container.read(cartSavingsProvider), 30.0); // MRP 295 - 265 = 30

      // Add another to exceed ₹500
      notifier.addToCart(testProduct1, qty: 1); // Now 2 items = 530.0
      expect(container.read(cartItemCountProvider), 2);
      expect(container.read(cartSubtotalProvider), 530.0);
      expect(container.read(cartDeliveryFeeProvider), 0.0); // Zero delivery fee
      expect(container.read(cartTotalToPayProvider), 530.0);

      // Decrease quantity to 0 removes the item
      notifier.updateQuantity('prod-atta-5kg', 0);
      expect(container.read(cartProvider).isEmpty, isTrue);
    });

    test('CollectionsModel accurately parses featured, bestsellers, newArrivals, and essentials', () {
      final raw = {
        'featured': [testProduct1.toJson()],
        'newArrivals': [testProduct2.toJson()],
        'bestsellers': [testProduct1.toJson()],
        'essentials': [testProduct2.toJson()],
      };

      final parsed = CollectionsModel.fromJson(raw);
      expect(parsed.featured.length, 1);
      expect(parsed.featured[0].name, 'Aashirvaad Shudh Chakki Atta');
      expect(parsed.newArrivals.length, 1);
      expect(parsed.newArrivals[0].name, 'Fortune Sunlite Refined Oil');
      expect(parsed.bestsellers.length, 1);
      expect(parsed.essentials.length, 1);
    });

    test('CartValidationResponseModel parses server validation response correctly', () {
      final raw = {
        'isValid': true,
        'hasAdjustments': false,
        'items': [
          {
            'productId': 'prod-atta-5kg',
            'name': 'Aashirvaad Shudh Chakki Atta',
            'brand': 'Aashirvaad',
            'sellingPrice': 265.0,
            'mrp': 295.0,
            'requestedQuantity': 2,
            'validQuantity': 2,
            'availableStock': 5,
            'lineSubtotal': 530.0,
            'lineMrpTotal': 590.0,
            'status': 'valid',
          }
        ],
        'subtotal': 530.0,
        'totalMrp': 590.0,
        'savings': 60.0,
        'deliveryFee': 0.0,
        'totalToPay': 530.0,
        'itemCount': 2,
      };

      final res = CartValidationResponseModel.fromJson(raw);
      expect(res.isValid, isTrue);
      expect(res.hasAdjustments, isFalse);
      expect(res.items.length, 1);
      expect(res.subtotal, 530.0);
      expect(res.deliveryFee, 0.0);
      expect(res.totalToPay, 530.0);
    });
  });
}
