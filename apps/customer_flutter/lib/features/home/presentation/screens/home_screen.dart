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
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../admin/presentation/screens/admin_categories_screen.dart';
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
              // Search Bar & Filter Button Row
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
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
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Search atta, dal, namkeen...'.tr(lang),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppColors.textTertiary, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Material(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                      onTap: () => _showFilterBottomSheet(context, ref, lang),
                      child: Container(
                        height: 46,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.tune, color: Colors.white, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              'Filter'.tr(lang),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
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
                  final displayedIds = <String>{};
                  final essentials = collections.essentials.where((p) => displayedIds.add(p.id)).take(4).toList();
                  final featured = collections.featured.where((p) => displayedIds.add(p.id)).take(4).toList();
                  final bestsellers = collections.bestsellers.where((p) => displayedIds.add(p.id)).take(4).toList();
                  final newArrivals = collections.newArrivals.where((p) => displayedIds.add(p.id)).take(4).toList();

                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Popular Everyday Essentials
                      if (essentials.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Popular Everyday Essentials'.tr(lang),
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, essentials),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // Featured Products
                      if (featured.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Featured Products'.tr(lang),
                          icon: Icons.star_outline,
                          iconColor: AppColors.accent,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, featured),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // Bestsellers
                      if (bestsellers.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'Bestsellers'.tr(lang),
                          icon: Icons.local_fire_department_outlined,
                          iconColor: Colors.deepOrange,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, bestsellers),
                        const SizedBox(height: AppDimensions.xl),
                      ],

                      // New Arrivals
                      if (newArrivals.isNotEmpty) ...[
                        _buildSectionHeader(
                          context,
                          title: 'New Arrivals'.tr(lang),
                          icon: Icons.new_releases_outlined,
                          iconColor: AppColors.primary,
                          onViewAll: () => context.push('/products'),
                          seeAllLabel: 'See all'.tr(lang),
                        ),
                        const SizedBox(height: AppDimensions.sm),
                        _buildProductGrid(context, newArrivals),
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

  void _showFilterBottomSheet(BuildContext context, WidgetRef ref, String lang) {
    final categoriesAsync = ref.read(categoriesProvider);
    final authState = ref.read(authProvider);
    final isAdmin = authState.isAdmin;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 6),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title Row
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 12, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.tune, color: AppColors.primary, size: 22),
                        const SizedBox(width: 8),
                        Text(
                          'Categories & Filters'.tr(lang),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 22),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Scrollable Filter Body
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Quick Filters Chips
                      Text(
                        'Quick Filters'.tr(lang),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ActionChip(
                            avatar: const Icon(Icons.grid_view, size: 16, color: AppColors.primary),
                            label: Text('All Items'.tr(lang)),
                            backgroundColor: AppColors.primaryContainer,
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              context.push('/products');
                            },
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.check_circle_outline, size: 16, color: AppColors.primary),
                            label: Text('In Stock Only'.tr(lang)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              context.push('/products?inStock=true');
                            },
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.arrow_upward, size: 16),
                            label: Text('Price: Low to High'.tr(lang)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              context.push('/products?sort=price_asc');
                            },
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.arrow_downward, size: 16),
                            label: Text('Price: High to Low'.tr(lang)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              context.push('/products?sort=price_desc');
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Kirana Store Categories List
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'All Categories'.tr(lang),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              context.go('/categories');
                            },
                            child: Text('View All'.tr(lang), style: const TextStyle(color: AppColors.primary, fontSize: 12)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      categoriesAsync.when(
                        data: (categories) {
                          final active = categories.where((c) => c.isActive).toList();
                          return ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: active.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (context, idx) {
                              final cat = active[idx];
                              return ListTile(
                                dense: true,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                leading: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: const BoxDecoration(
                                    color: AppColors.primaryContainer,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(cat.iconData, color: AppColors.primary, size: 18),
                                ),
                                title: Text(
                                  cat.name.tr(lang),
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                                subtitle: Text(
                                  '${cat.itemCount} items',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                                ),
                                trailing: const Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiary),
                                onTap: () {
                                  Navigator.of(ctx).pop();
                                  context.push(
                                    '/products?categoryId=${cat.id}&categoryName=${Uri.encodeComponent(cat.name)}',
                                  );
                                },
                              );
                            },
                          );
                        },
                        loading: () => const Center(
                          child: Padding(
                            padding: EdgeInsets.all(20),
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        ),
                        error: (e, _) => Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text('Error loading categories: $e', style: const TextStyle(color: AppColors.error)),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Admin Category CRUD shortcut
                      if (isAdmin) ...[
                        const Divider(height: 24),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.accent.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                            border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const CircleAvatar(
                                radius: 18,
                                backgroundColor: AppColors.accent,
                                child: Icon(Icons.settings, color: Colors.white, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Store Admin: Manage Categories'.tr(lang),
                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                    ),
                                    const Text(
                                      'Add, edit, or delete categories & subcategories',
                                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                onPressed: () {
                                  Navigator.of(ctx).pop();
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const AdminCategoriesScreen()),
                                  );
                                },
                                child: Text('Manage'.tr(lang)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
