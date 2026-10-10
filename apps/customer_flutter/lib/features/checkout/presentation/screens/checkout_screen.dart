import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String _selectedPayment = 'cod';
  bool _isSubmitting = false;

  @override
  Widget build(BuildContext context) {
    final subtotal = ref.watch(cartSubtotalProvider);
    final deliveryFee = subtotal >= 500 ? 0.0 : 30.0;
    final totalAmount = subtotal + deliveryFee;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout & Delivery')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Delivery Address Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.location_on_outlined, color: AppColors.primary, size: 20),
                        SizedBox(width: 8),
                        Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      ],
                    ),
                    const SizedBox(height: AppDimensions.sm),
                    const Text('Abhay Kushwaha • +91 98765 43210', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 2),
                    const Text(
                      'House 42, Main Bazar, Near City Post Office, New Delhi - 110001',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Payment Methods
            const Text(
              'Select Payment Option',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: AppDimensions.sm),

            // Cash on Delivery
            Card(
              shape: RoundedRectangleBorder(
                side: BorderSide(
                  color: _selectedPayment == 'cod' ? AppColors.primary : AppColors.border,
                  width: _selectedPayment == 'cod' ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              ),
              child: InkWell(
                onTap: () => setState(() => _selectedPayment = 'cod'),
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Row(
                    children: [
                      Icon(
                        _selectedPayment == 'cod' ? Icons.radio_button_checked : Icons.radio_button_off,
                        color: _selectedPayment == 'cod' ? AppColors.primary : AppColors.textTertiary,
                      ),
                      const SizedBox(width: AppDimensions.md),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Cash on Delivery (COD)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            SizedBox(height: 2),
                            Text(
                              'Pay in cash or UPI scanner directly to our store delivery partner.',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppDimensions.sm),
                      const Icon(Icons.payments_outlined, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.sm),

            // WhatsApp QR / UPI
            Card(
              shape: RoundedRectangleBorder(
                side: BorderSide(
                  color: _selectedPayment == 'whatsapp_qr' ? AppColors.primary : AppColors.border,
                  width: _selectedPayment == 'whatsapp_qr' ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              ),
              child: InkWell(
                onTap: () => setState(() => _selectedPayment = 'whatsapp_qr'),
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Row(
                    children: [
                      Icon(
                        _selectedPayment == 'whatsapp_qr' ? Icons.radio_button_checked : Icons.radio_button_off,
                        color: _selectedPayment == 'whatsapp_qr' ? AppColors.primary : AppColors.textTertiary,
                      ),
                      const SizedBox(width: AppDimensions.md),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Store WhatsApp QR / Direct UPI', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            SizedBox(height: 2),
                            Text(
                              'Scan store QR code and share receipt on store WhatsApp. Verified by store staff.',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: AppDimensions.sm),
                      const Icon(Icons.qr_code_scanner_outlined, color: AppColors.primary),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.xl),

            // Operational Notice
            Container(
              padding: const EdgeInsets.all(AppDimensions.md),
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
              ),
              child: const Row(
                children: [
                  Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Zero gateway markups. Orders are handled directly by Kanhaiya General Store.',
                      style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
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
            onPressed: _isSubmitting
                ? null
                : () async {
                    setState(() => _isSubmitting = true);
                    await Future.delayed(const Duration(milliseconds: 700));
                    if (!context.mounted) return;

                    final orderNumber = 'KS-202610-${1000 + DateTime.now().millisecond}';
                    ref.read(cartProvider.notifier).clearCart();

                    showDialog(
                      context: context,
                      barrierDismissible: false,
                      builder: (dialogCtx) => AlertDialog(
                        icon: const Icon(Icons.check_circle, color: AppColors.primary, size: 48),
                        title: const Text('Order Placed Successfully'),
                        content: Text(
                          'Your order $orderNumber has been received. Our team is preparing your grocery items.',
                          textAlign: TextAlign.center,
                        ),
                        actions: [
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(dialogCtx);
                              context.go('/orders');
                            },
                            child: const Text('View Orders'),
                          ),
                        ],
                      ),
                    );
                  },
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text('Confirm Order • ${CurrencyFormatter.format(totalAmount)}'),
          ),
        ),
      ),
    );
  }
}
