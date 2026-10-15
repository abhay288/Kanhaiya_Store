import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../../core/widgets/product_card.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../controllers/catalog_providers.dart';

final singleProductProvider = FutureProvider.family((ref, String id) async {
  ref.watch(catalogVersionProvider);
  final repo = ref.watch(catalogRepositoryProvider);
  return repo.getProductById(id);
});

class ProductDetailScreen extends ConsumerStatefulWidget {
  final String productId;

  const ProductDetailScreen({
    super.key,
    required this.productId,
  });

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  String? _selectedImageUrl;

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(singleProductProvider(widget.productId));
    final cart = ref.watch(cartProvider);
    final relatedAsync = ref.watch(relatedProductsProvider(widget.productId));

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
        final isMaxStockReached = inCartCount >= product.stockQuantity;

        final allImages = product.images.isNotEmpty
            ? product.images.map((i) => i.url).toList()
            : [product.imageUrl];
        final currentImage = _selectedImageUrl ?? product.imageUrl;

        return Scaffold(
          appBar: AppBar(
            title: Text(product.name),
            actions: [
              IconButton(
                icon: const Icon(Icons.share_outlined),
                tooltip: 'Share Product',
                onPressed: () async {
                  final link = 'https://kanhaiyastore.com/product/${product.id}';
                  await Clipboard.setData(ClipboardData(text: link));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Product link copied: $link'),
                        backgroundColor: AppColors.primary,
                        duration: const Duration(seconds: 3),
                      ),
                    );
                  }
                },
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(AppDimensions.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Image Container
                Container(
                  height: 240,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    border: Border.all(color: AppColors.border),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: currentImage.isNotEmpty
                      ? Image.network(
                          currentImage,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const Center(
                            child: Icon(Icons.shopping_bag_outlined, size: 60, color: AppColors.textTertiary),
                          ),
                        )
                      : const Center(
                          child: Icon(Icons.shopping_bag_outlined, size: 60, color: AppColors.textTertiary),
                        ),
                ),
                const SizedBox(height: AppDimensions.sm),

                // Thumbnails Gallery
                if (allImages.length > 1) ...[
                  SizedBox(
                    height: 54,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: allImages.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, idx) {
                        final imgUrl = allImages[idx];
                        final isSelected = currentImage == imgUrl;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedImageUrl = imgUrl),
                          child: Container(
                            width: 54,
                            height: 54,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : AppColors.border,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Image.network(
                              imgUrl,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const Icon(Icons.image, size: 20),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: AppDimensions.md),
                ],

                // Category pill, Brand, & Pack Size (Responsive Wrap)
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (product.brand.isNotEmpty) ...[
                          Text(
                            product.brand.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppColors.accent,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
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
                      ],
                    ),
                    Text(
                      product.packSize.isNotEmpty ? product.packSize : 'Unit: ${product.unit}',
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
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerLeft,
                          child: Row(
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
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentContainer,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '${product.discountPercentage}% OFF',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.accent,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
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
                  product.description.isNotEmpty
                      ? product.description
                      : 'Authentic daily kirana essentials curated for freshness and pure quality.',
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
                const SizedBox(height: AppDimensions.xl),

                // Related Products
                relatedAsync.when(
                  data: (relatedList) {
                    if (relatedList.isEmpty) return const SizedBox.shrink();
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Similar in ${product.categoryName}',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: AppDimensions.md),
                        Builder(
                          builder: (context) {
                            final screenWidth = MediaQuery.of(context).size.width;
                            final crossAxisCount = screenWidth >= 600 ? 3 : 2;
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
                              itemCount: relatedList.length,
                              itemBuilder: (context, index) {
                                final rel = relatedList[index];
                                return ProductCard(
                                  product: rel,
                                  onTap: () => context.push('/product-detail/${rel.id}'),
                                );
                              },
                            );
                          },
                        ),
                      ],
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, _) => const SizedBox.shrink(),
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
                onPressed: product.inStock && !isMaxStockReached
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
                label: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    !product.inStock
                        ? 'Out of Stock'
                        : isMaxStockReached
                            ? 'Max Stock Reached ($inCartCount)'
                            : inCartCount > 0
                                ? 'In Your Cart ($inCartCount) — Add Another'
                                : 'Add to Cart • ${CurrencyFormatter.format(product.sellingPrice)}',
                  ),
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
          onRetry: () => ref.invalidate(singleProductProvider(widget.productId)),
        ),
      ),
    );
  }
}
