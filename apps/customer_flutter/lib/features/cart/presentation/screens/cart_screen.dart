import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../controllers/cart_controller.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _isValidating = false;

  Future<void> _handleRevalidate() async {
    setState(() => _isValidating = true);
    final result = await ref.read(cartProvider.notifier).revalidateCart();
    setState(() => _isValidating = false);

    if (mounted && result != null && result.hasAdjustments) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cart adjusted based on latest stock & prices.'),
          backgroundColor: AppColors.accent,
        ),
      );
    }
  }

  void _showClearCartConfirmation() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Shopping Basket?'),
        content: const Text('Are you sure you want to remove all items from your cart?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              ref.read(cartProvider.notifier).clearCart();
              Navigator.pop(ctx);
            },
            child: const Text('Clear', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final subtotal = ref.watch(cartSubtotalProvider);
    final savings = ref.watch(cartSavingsProvider);
    final totalToPay = ref.watch(cartTotalToPayProvider);

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Cart')),
        body: EmptyView(
          title: 'Your Grocery Basket is Empty',
          description: 'Explore grains, dals, flour, spices, milk products and breads.',
          actionLabel: 'Browse Store',
          onAction: () => context.go('/home'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('My Cart (${cart.length} ${cart.length == 1 ? 'item' : 'items'})'),
        actions: [
          IconButton(
            icon: _isValidating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            tooltip: 'Validate prices & stock',
            onPressed: _isValidating ? null : _handleRevalidate,
          ),
          TextButton(
            onPressed: _showClearCartConfirmation,
            child: const Text('Clear', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)),
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
                final maxStock = item.product.stockQuantity;
                final isAtMax = item.quantity >= maxStock;

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.sm),
                    child: Row(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                            border: Border.all(color: AppColors.border),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: item.product.imageUrl.isNotEmpty
                              ? Image.network(
                                  item.product.imageUrl,
                                  fit: BoxFit.contain,
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
                                '${item.product.packSize.isNotEmpty ? item.product.packSize : item.product.unit} • ${CurrencyFormatter.format(item.product.sellingPrice)} each',
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
                        // Steppers with stock cap
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
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
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add, size: 18),
                                  onPressed: isAtMax
                                      ? null
                                      : () {
                                          ref.read(cartProvider.notifier).updateQuantity(
                                                item.product.id,
                                                item.quantity + 1,
                                              );
                                        },
                                ),
                              ],
                            ),
                            if (isAtMax)
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: Text(
                                  'Max stock ($maxStock)',
                                  style: const TextStyle(fontSize: 10, color: AppColors.accent, fontWeight: FontWeight.w700),
                                ),
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
                    if (savings > 0) ...[
                      const SizedBox(height: AppDimensions.sm),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Your Savings on MRP', style: TextStyle(color: Colors.green)),
                          Text(
                            '- ${CurrencyFormatter.format(savings)}',
                            style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.green),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: AppDimensions.sm),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Order Fulfillment', style: TextStyle(color: AppColors.textSecondary)),
                        const Text(
                          'In-Store Pickup',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppDimensions.xs),
                    const Text(
                      'Collect at Store: Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('To Pay', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                        Text(
                          CurrencyFormatter.format(totalToPay),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.md),

            // Kirana Guarantee card
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
                      'Live inventory verified. Order now and collect at store counter.',
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
          child: ElevatedButton(
            onPressed: () {
              final authState = ref.read(authProvider);
              if (!authState.isAuthenticated) {
                context.push('/signin?redirect=/cart');
              } else {
                context.push('/checkout');
              }
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Proceed to Checkout'),
                const SizedBox(width: 8),
                Text('•  ${CurrencyFormatter.format(totalToPay)}'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
