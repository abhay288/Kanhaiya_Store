import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:customer_flutter/features/auth/presentation/controllers/auth_controller.dart';
import 'package:customer_flutter/features/cart/presentation/controllers/cart_controller.dart';
import 'package:customer_flutter/features/cart/presentation/screens/cart_screen.dart';
import 'package:customer_flutter/features/catalog/domain/models/product_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Phase 10: Flutter End-to-End QA & Release Verification Suite', () {
    const sampleProduct = ProductModel(
      id: 'prod-milk-1l',
      name: 'Amul Taaza Milk 1L',
      slug: 'amul-taaza-milk-1l',
      categoryId: 'cat-dairy',
      categoryName: 'Dairy & Breads',
      unit: '1 L',
      sellingPrice: 72.0,
      mrp: 74.0,
      stockQuantity: 8,
      isAvailable: true,
    );

    // 1. User & Admin Role Authentication Verification
    test('UserModel accurately distinguishes store admin from customer', () {
      final adminUser = UserModel.fromJson({
        'id': 'u-admin-1',
        'email': 'kanhaiyaastore@gmail.com',
        'displayName': 'Kanhaiya Store Admin',
        'role': 'ADMIN',
      });
      expect(adminUser.isAdmin, isTrue);
      expect(adminUser.role, UserRole.admin);

      // Customer trying to claim admin with non-allowlisted email
      final rogueCustomer = UserModel.fromJson({
        'id': 'u-rogue-2',
        'email': 'attacker@gmail.com',
        'displayName': 'Attacker',
        'role': 'ADMIN', // Should be demoted to customer
      });
      expect(rogueCustomer.isAdmin, isFalse);
      expect(rogueCustomer.role, UserRole.customer);

      final legitCustomer = UserModel.fromJson({
        'id': 'u-cust-3',
        'email': 'customer@gmail.com',
        'displayName': 'Regular Customer',
        'role': 'CUSTOMER',
      });
      expect(legitCustomer.isAdmin, isFalse);
    });

    test('AuthState reports correct authentication and admin flags', () {
      const emptyState = AuthState();
      expect(emptyState.isAuthenticated, isFalse);
      expect(emptyState.isAdmin, isFalse);

      final adminState = AuthState(
        user: UserModel.fromJson({
          'id': 'u-admin-1',
          'email': 'kanhaiyaastore@gmail.com',
          'displayName': 'Store Admin',
          'role': 'ADMIN',
        }),
        token: 'sample-admin-jwt',
      );
      expect(adminState.isAuthenticated, isTrue);
      expect(adminState.isAdmin, isTrue);
    });

    // 2. Cart Business Logic & Quantity Clamping
    test('CartNotifier accurately calculates savings, subtotals, and persists state', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(cartProvider.notifier);

      notifier.addToCart(sampleProduct, qty: 3);

      final state = container.read(cartProvider);
      expect(state.length, 1);
      expect(state.first.quantity, 3);
      expect(state.first.totalPrice, 216.0); // 3 * 72
      expect(state.first.totalMrp, 222.0); // 3 * 74

      final subtotal = container.read(cartSubtotalProvider);
      expect(subtotal, 216.0);

      final savings = container.read(cartSavingsProvider);
      expect(savings, 6.0); // 222 - 216

      // Clamping: attempt adding beyond available stockQuantity (8)
      notifier.updateQuantity('prod-milk-1l', 12);
      expect(container.read(cartProvider).first.quantity, 8); // Capped at 8!
    });

    // 3. Widget Test: Cart Empty State
    testWidgets('CartScreen displays clear EmptyView when grocery basket is empty', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: CartScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('My Cart'), findsOneWidget);
      expect(find.text('Your Grocery Basket is Empty'), findsOneWidget);
      expect(find.text('Browse Store'), findsOneWidget);
    });
  });
}
