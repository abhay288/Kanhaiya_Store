import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_categories_screen.dart';
import '../../features/admin/presentation/screens/admin_product_edit_screen.dart';
import '../../features/admin/presentation/screens/admin_products_screen.dart';
import '../../features/admin/presentation/screens/admin_inventory_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_orders_screen.dart';
import '../../features/admin/presentation/screens/admin_order_details_screen.dart';
import '../../features/admin/presentation/screens/admin_analytics_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_reports_screen.dart';
import '../../features/admin/presentation/screens/admin_customers_screen.dart';
import '../../features/admin/presentation/screens/admin_store_settings_screen.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../../features/auth/presentation/screens/google_signin_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/cart/presentation/screens/cart_screen.dart';
import '../../features/catalog/presentation/screens/product_detail_screen.dart';
import '../../features/catalog/presentation/screens/product_listing_screen.dart';
import '../../features/categories/presentation/screens/category_screen.dart';
import '../../features/checkout/presentation/screens/checkout_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/orders/presentation/screens/orders_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import 'scaffold_with_nav_bar.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    routes: [
      // Splash Screen
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Auth / Sign In Screen
      GoRoute(
        path: '/signin',
        builder: (context, state) => const GoogleSignInScreen(),
      ),

      // Notifications Screen
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),

      // Product Listing Screen
      GoRoute(
        path: '/products',
        builder: (context, state) {
          final categoryId = state.uri.queryParameters['categoryId'];
          final categoryName = state.uri.queryParameters['categoryName'];
          return ProductListingScreen(
            categoryId: categoryId,
            categoryName: categoryName,
          );
        },
      ),

      // Product Detail Screen
      GoRoute(
        path: '/product-detail/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ProductDetailScreen(productId: id);
        },
      ),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ProductDetailScreen(productId: id);
        },
      ),
      GoRoute(
        path: '/p/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ProductDetailScreen(productId: id);
        },
      ),

      // Checkout Screen
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),

      // Protected Admin Dashboard Routes
      GoRoute(
        path: '/admin',
        redirect: (context, state) {
          // Strict route guard: Unauthorized users or normal customers cannot enter admin routes
          if (!authState.isAdmin) {
            return '/signin';
          }
          return null;
        },
        builder: (context, state) => const AdminDashboardScreen(),
        routes: [
          GoRoute(
            path: 'products',
            builder: (context, state) => const AdminProductsScreen(),
            routes: [
              GoRoute(
                path: 'new',
                builder: (context, state) => const AdminProductEditScreen(),
              ),
              GoRoute(
                path: 'edit/:id',
                builder: (context, state) => AdminProductEditScreen(
                  productId: state.pathParameters['id'],
                ),
              ),
            ],
          ),
          GoRoute(
            path: 'categories',
            builder: (context, state) => const AdminCategoriesScreen(),
          ),
          GoRoute(
            path: 'inventory',
            builder: (context, state) => const AdminInventoryDashboardScreen(),
          ),
          GoRoute(
            path: 'orders',
            builder: (context, state) => const AdminOrdersScreen(),
            routes: [
              GoRoute(
                path: ':id',
                builder: (context, state) => AdminOrderDetailsScreen(
                  orderId: state.pathParameters['id'] ?? '',
                ),
              ),
            ],
          ),
          GoRoute(
            path: 'analytics',
            builder: (context, state) => const AdminAnalyticsDashboardScreen(),
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const AdminReportsScreen(),
          ),
          GoRoute(
            path: 'customers',
            builder: (context, state) => const AdminCustomersScreen(),
          ),
          GoRoute(
            path: 'settings',
            builder: (context, state) => const AdminStoreSettingsScreen(),
          ),
        ],
      ),

      // Main Store Shell (Tabs: Home, Categories, Cart, Orders, Profile)
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavBar(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Home
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),

          // Tab 1: Categories
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/categories',
                builder: (context, state) => const CategoryScreen(),
              ),
            ],
          ),

          // Tab 2: Cart
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/cart',
                builder: (context, state) => const CartScreen(),
              ),
            ],
          ),

          // Tab 3: Orders
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/orders',
                builder: (context, state) => const OrdersScreen(),
              ),
            ],
          ),

          // Tab 4: Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
