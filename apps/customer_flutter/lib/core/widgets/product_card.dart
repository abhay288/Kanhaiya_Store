import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../utils/currency_formatter.dart';
import '../../features/catalog/domain/models/product_model.dart';
import '../../features/cart/presentation/controllers/cart_controller.dart';
import '../localization/app_language_provider.dart';
import '../localization/app_strings.dart';

class ProductCard extends ConsumerWidget {
  final ProductModel product;
  final VoidCallback? onTap;

  const ProductCard({
    super.key,
    required this.product,
    this.onTap,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(appLanguageProvider);
    final cart = ref.watch(cartProvider);
    final inCartItem = cart.where((item) => item.product.id == product.id).firstOrNull;
    final inCartCount = inCartItem?.quantity ?? 0;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image with Stock Status Badge
              Stack(
                children: [
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: product.imageUrl.isNotEmpty
                        ? Image.network(
                            product.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const Center(
                              child: Icon(Icons.shopping_bag_outlined, color: AppColors.textTertiary, size: 40),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.shopping_bag_outlined, color: AppColors.textTertiary, size: 40),
                          ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                        boxShadow: const [
                          BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1)),
                        ],
                      ),
                      child: Text(
                        product.inStock
                            ? '${product.stockQuantity} ${'in stock'.tr(lang)}'
                            : 'Out of stock'.tr(lang),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: product.inStock ? AppColors.primary : AppColors.error,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.sm),

              // Brand
              if (product.brand.isNotEmpty) ...[
                Text(
                  product.brand.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: AppColors.accent,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 1),
              ],

              // Product Name
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 2),

              // Unit
              Text(
                product.packSize.isNotEmpty ? product.packSize : product.unit,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),

              // Price Row (Fitted to prevent overflow on narrow screens)
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      CurrencyFormatter.format(product.sellingPrice),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                    if (product.mrp > product.sellingPrice) ...[
                      const SizedBox(width: 6),
                      Text(
                        CurrencyFormatter.format(product.mrp),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textTertiary,
                          decoration: TextDecoration.lineThrough,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${(((product.mrp - product.sellingPrice) / product.mrp) * 100).round()}% OFF',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: AppColors.accent,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppDimensions.sm),

              // Add to Cart Button
              SizedBox(
                width: double.infinity,
                height: 34,
                child: inCartCount > 0
                    ? OutlinedButton.icon(
                        onPressed: () {
                          ref.read(cartProvider.notifier).addToCart(product);
                        },
                        icon: const Icon(Icons.check, size: 14),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('${'Added'.tr(lang)} ($inCartCount)'),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      )
                    : ElevatedButton.icon(
                        onPressed: product.inStock
                            ? () {
                                ref.read(cartProvider.notifier).addToCart(product);
                              }
                            : null,
                        icon: const Icon(Icons.add, size: 14),
                        label: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text('Add to Cart'.tr(lang)),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
