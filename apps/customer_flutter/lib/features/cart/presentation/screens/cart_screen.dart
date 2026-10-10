import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../controllers/cart_controller.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final deliveryFee = (subtotal >= 500 || subtotal == 0) ? 0.0 : 30.0;
    final totalAmount = subtotal + deliveryFee;

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Cart')),
        body: EmptyView(
          title: 'Your Grocery Basket is Empty',
          description: 'Explore farm-fresh dals, flour, spices, and packaged foods.',
          actionLabel: 'Browse Store',
          onAction: () => context.go('/home'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('My Cart (${cart.length} items)'),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(cartProvider.notifier).clearCart();
            },
            child: const Text('Clear', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          children: [
            // Items List
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: cart.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = cart[index];
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.sm),
                    child: Row(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: item.product.imageUrl.isNotEmpty
                              ? Image.network(
                                  item.product.imageUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => const Icon(Icons.shopping_bag_outlined),
                                )
                              : const Icon(Icons.shopping_bag_outlined),
                        ),
                        const SizedBox(width: AppDimensions.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.product.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                              ),
                              Text(
                                '${item.product.unit} • ${CurrencyFormatter.format(item.product.sellingPrice)} each',
                                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                CurrencyFormatter.format(item.totalPrice),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Steppers
                        Row(
                          children: [
                            IconButton(
                              icon: Icon(
                                item.quantity == 1 ? Icons.delete_outline : Icons.remove,
                                size: 18,
                                color: item.quantity == 1 ? AppColors.error : AppColors.textPrimary,
                              ),
                              onPressed: () {
                                ref.read(cartProvider.notifier).updateQuantity(
                                      item.product.id,
                                      item.quantity - 1,
                                    );
                              },
                            ),
                            Text(
                              '${item.quantity}',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, size: 18),
                              onPressed: () {
                                ref.read(cartProvider.notifier).updateQuantity(
                                      item.product.id,
                                      item.quantity + 1,
                                    );
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: AppDimensions.lg),

            // Bill Breakdown Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Bill Summary',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: AppDimensions.md),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Item Subtotal', style: TextStyle(color: AppColors.textSecondary)),
                        Text(CurrencyFormatter.format(subtotal), style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: AppDimensions.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Delivery Partner Fee', style: TextStyle(color: AppColors.textSecondary)),
                        Text(
                          deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(deliveryFee),
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: deliveryFee == 0 ? AppColors.primary : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    if (subtotal < 500) ...[
                      const SizedBox(height: AppDimensions.xs),
                      Text(
                        '💡 Add ${CurrencyFormatter.format(500 - subtotal)} more to qualify for FREE Delivery!',
                        style: const TextStyle(fontSize: 11, color: AppColors.secondary, fontWeight: FontWeight.w500),
                      ),
                    ],
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('To Pay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                        Text(
                          CurrencyFormatter.format(totalAmount),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
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
          child: ElevatedButton(
            onPressed: () => context.push('/checkout'),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Proceed to Checkout'),
                const SizedBox(width: 8),
                Text('•  ${CurrencyFormatter.format(totalAmount)}'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
