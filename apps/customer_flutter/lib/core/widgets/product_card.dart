import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_colors.dart';
import '../constants/app_dimensions.dart';
import '../utils/currency_formatter.dart';
import '../../features/catalog/domain/models/product_model.dart';
import '../../features/cart/presentation/controllers/cart_controller.dart';

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
                        product.inStock ? '${product.stockQuantity} in stock' : 'Out of stock',
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
                product.unit,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textSecondary,
                ),
              ),
              const Spacer(),

              // Price Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    CurrencyFormatter.format(product.sellingPrice),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
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
                      ),
                    ),
                  ],
                ],
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
                        label: Text('Added ($inCartCount)'),
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.zero,
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
                        label: const Text('Add to Cart'),
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
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
