import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/localization/app_language_provider.dart';
import '../../../../core/localization/app_strings.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../../core/widgets/product_card.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../../catalog/presentation/controllers/catalog_providers.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../../notifications/presentation/controllers/notification_controller.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);
    final collectionsAsync = ref.watch(collectionsProvider);
    final cartItemCount = ref.watch(cartItemCountProvider);
    final unreadNotificationCount = ref.watch(unreadNotificationCountProvider);
    final lang = ref.watch(appLanguageProvider);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 64,
        title: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  'assets/images/kgs_logo.png',
                  width: 42,
                  height: 42,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Kanhaiya General Store',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  Text(
                    'Fatehpur Roshnai, Sarvankhera, Kanpur Dehat',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Persistent Cart badge action
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined),
                onPressed: () => context.go('/cart'),
              ),
              if (cartItemCount > 0)
                Positioned(
                  right: 6,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '$cartItemCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          // Working Notification Bell icon with Live Unread Badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                tooltip: 'Notifications',
                onPressed: () => context.push('/notifications'),
              ),
              if (unreadNotificationCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 2,
                          offset: Offset(0, 1),
                        ),
                      ],
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      unreadNotificationCount > 9 ? '9+' : '$unreadNotificationCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(categoriesProvider);
          ref.invalidate(collectionsProvider);
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Bar Field
              GestureDetector(
                onTap: () => context.push('/products'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: AppColors.textTertiary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Search atta, dal, spices, milk products & breads...'.tr(lang),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppColors.textTertiary, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // Categories Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Shop by Category'.tr(lang),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  TextButton(
                    onPressed: () => context.go('/categories'),
                    child: Text('View All'.tr(lang), style: const TextStyle(color: AppColors.primary)),
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.sm),

              // Category Pills Carousel
              categoriesAsync.when(
                data: (categories) {
                  final active = categories.where((c) => c.isActive).toList();
                  return SizedBox(
                    height: 94,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: active.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final cat = active[index];
                        return GestureDetector(
                          onTap: () => context.push('/products?categoryId=${cat.id}&categoryName=${Uri.encodeComponent(cat.name)}'),
                          child: Container(
                            width: 84,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryContainer,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: Image.network(
                                    cat.realImageUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => Icon(cat.iconData, color: AppColors.primary, size: 20),
                                    loadingBuilder: (context, child, loadingProgress) {
                                      if (loadingProgress == null) return child;
                                      return Center(
                                        child: Icon(cat.iconData, color: AppColors.primary, size: 18),
                                      );
                                    },
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  cat.name.split(',')[0].tr(lang),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
                loading: () => const SizedBox(
                  height: 94,
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
                error: (e, _) => Text('Could not load categories: $e'),
              ),
              const SizedBox(height: AppDimensions.xl),

              // Curated Collections
              collectionsAsync.when(
                data: (collections) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Popular Everyday Essentials
                      if (collections.essentials.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Popular Everyday Essentials'.tr(lang),
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, collections.essentials.take(4).toList()),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // Featured Products
                      if (collections.featured.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Featured Products'.tr(lang),
                          icon: Icons.star_outline,
                          iconColor: AppColors.accent,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, collections.featured.take(4).toList()),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // Bestsellers
                      if (collections.bestsellers.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Bestsellers'.tr(lang),
                          icon: Icons.local_fire_department_outlined,
                          iconColor: Colors.deepOrange,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, collections.bestsellers.take(4).toList()),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // New Arrivals
                      if (collections.newArrivals.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'New Arrivals'.tr(lang),
                          icon: Icons.new_releases_outlined,
                          iconColor: AppColors.primary,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, collections.newArrivals.take(4).toList()),
                      ],
                    ],
                  );
                },
                loading: () => const LoadingView(message: 'Loading grocery essentials...'),
                error: (err, _) => ErrorView(
                  message: 'Failed to load collections: $err',
                  onRetry: () => ref.invalidate(collectionsProvider),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required String title,
    IconData? icon,
    Color? iconColor,
    VoidCallback? onViewAll,
    String? seeAllLabel,
  }) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: iconColor),
          const SizedBox(width: 6),
        ],
        Expanded(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
        ),
        if (onViewAll != null)
          TextButton(
            onPressed: onViewAll,
            child: Text(seeAllLabel ?? 'See all', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
          ),
      ],
    );
  }

  Widget _buildProductGrid(BuildContext context, List<ProductModel> products) {
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = screenWidth >= 600 ? 3 : 2;
    // Dynamic aspect ratio to prevent button clipping on compact phones
    final childAspectRatio = screenWidth < 360 ? 0.60 : 0.64;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: childAspectRatio,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return ProductCard(
          product: product,
          onTap: () => context.push('/product-detail/${product.id}'),
        );
      },
    );
  }
}
