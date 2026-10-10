import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../controllers/catalog_providers.dart';

final singleProductProvider = FutureProvider.family((ref, String id) async {
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getProductById(id);
});

class ProductDetailScreen extends ConsumerWidget {
  final String productId;

  const ProductDetailScreen({
    super.key,
    required this.productId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(singleProductProvider(productId));
    final cart = ref.watch(cartProvider);

    return productAsync.when(
      data: (product) {
        if (product == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Product Details')),
            body: const EmptyView(
              title: 'Product Not Found',
              description: 'This grocery item is currently unavailable.',
            ),
          );
        }

        final inCartItem = cart.where((item) => item.product.id == product.id).firstOrNull;
        final inCartCount = inCartItem?.quantity ?? 0;

        return Scaffold(
          appBar: AppBar(
            title: Text(product.name),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(AppDimensions.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Image
                Container(
                  height: 240,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    border: Border.all(color: AppColors.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: product.imageUrl.isNotEmpty
                      ? Image.network(
                          product.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Center(
                            child: Icon(Icons.shopping_bag_outlined, size: 60, color: AppColors.textTertiary),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.shopping_bag_outlined, size: 60, color: AppColors.textTertiary),
                        ),
                ),
                const SizedBox(height: AppDimensions.lg),

                // Category pill & Pack Size
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        product.categoryName.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.onPrimaryContainer,
                        ),
                      ),
                    ),
                    Text(
                      'Unit: ${product.unit}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppDimensions.sm),

                // Product Name
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: AppDimensions.md),

                // Price and Availability Row
                Container(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            CurrencyFormatter.format(product.sellingPrice),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                          if (product.mrp > product.sellingPrice) ...[
                            const SizedBox(width: 8),
                            Text(
                              CurrencyFormatter.format(product.mrp),
                              style: const TextStyle(
                                fontSize: 14,
                                color: AppColors.textTertiary,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: product.inStock ? AppColors.primaryContainer : AppColors.errorContainer,
                          borderRadius: BorderRadius.circular(AppDimensions.radiusFull),
                        ),
                        child: Text(
                          product.inStock ? '${product.stockQuantity} in stock' : 'Out of stock',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: product.inStock ? AppColors.onPrimaryContainer : AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimensions.lg),

                // Description
                const Text(
                  'About this item',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                Text(
                  product.description,
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
                ),
                const SizedBox(height: AppDimensions.xl),

                // Quality assurance
                Container(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified_outlined, color: AppColors.primary, size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Hand-checked quality, fresh packaging, guaranteed genuine brand product.',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: SafeArea(
            child: Container(
              padding: const EdgeInsets.all(AppDimensions.md),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: ElevatedButton.icon(
                onPressed: product.inStock
                    ? () {
                        ref.read(cartProvider.notifier).addToCart(product);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${product.name} added to cart'),
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      }
                    : null,
                icon: Icon(inCartCount > 0 ? Icons.check : Icons.shopping_bag_outlined),
                label: Text(
                  inCartCount > 0
                      ? 'In Your Cart ($inCartCount) — Add Another'
                      : 'Add to Cart • ${CurrencyFormatter.format(product.sellingPrice)}',
                ),
              ),
            ),
          ),
        );
      },
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const LoadingView(),
      ),
      error: (err, _) => Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: ErrorView(
          message: '$err',
          onRetry: () => ref.invalidate(singleProductProvider(productId)),
        ),
      ),
    );
  }
}
