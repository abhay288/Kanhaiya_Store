import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../domain/models/order_model.dart';

class OrderConfirmationScreen extends StatelessWidget {
  final CustomerOrderModel order;

  const OrderConfirmationScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy, hh:mm a');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Placed Successfully'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.lg),
        child: Column(
          children: [
            // Success Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                vertical: AppDimensions.xl,
                horizontal: AppDimensions.lg,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
                border: Border.all(color: AppColors.border),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceVariant,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_rounded,
                      color: AppColors.primary,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: AppDimensions.md),
                  const Text(
                    'Thank you for your order!',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Kanhaiya General Store',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppDimensions.md),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Order #${order.orderNumber}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    dateFormat.format(order.createdAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Payment Notice Card (Pending Status)
            if (order.paymentMethod == 'WHATSAPP_QR')
              Card(
                color: const Color(0xFFFEF3C7),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Color(0xFFFDE68A)),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.qr_code_2, color: Color(0xFF92400E), size: 22),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'WhatsApp QR Payment (Status: PENDING)',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: Color(0xFF92400E),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Your order is recorded as PENDING. Contact our store on WhatsApp to receive the official UPI QR code. Send the payment screenshot to confirm your order.',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF78350F),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(200),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Store WhatsApp: +91 9876543210\nQuote Order #${order.orderNumber} for ₹${order.totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF92400E),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Card(
                color: const Color(0xFFECFDF5),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Color(0xFFA7F3D0)),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Row(
                    children: [
                      const Icon(Icons.payments_outlined, color: Color(0xFF065F46), size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Cash on Delivery (Status: PENDING)',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: Color(0xFF065F46),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              order.fulfillmentMethod == 'DELIVERY'
                                  ? 'Pay ₹${order.totalAmount.toStringAsFixed(0)} in cash or UPI upon delivery to your doorstep.'
                                  : 'Pay ₹${order.totalAmount.toStringAsFixed(0)} at the store counter upon order collection.',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF047857),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: AppDimensions.lg),

            // Fulfillment Details Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          order.fulfillmentMethod == 'DELIVERY'
                              ? Icons.local_shipping_outlined
                              : Icons.storefront_outlined,
                          color: AppColors.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          order.fulfillmentMethod == 'DELIVERY'
                              ? 'Delivery Address Snapshot'
                              : 'Store Pickup Information',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    if (order.fulfillmentMethod == 'DELIVERY' && order.deliveryAddress != null) ...[
                      Text(
                        '${order.deliveryAddress!.name} (${order.deliveryAddress!.phone})',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${order.deliveryAddress!.houseNumber}, ${order.deliveryAddress!.street}'
                        '${order.deliveryAddress!.landmark != null && order.deliveryAddress!.landmark!.isNotEmpty ? ", Near ${order.deliveryAddress!.landmark}" : ""}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      Text(
                        '${order.deliveryAddress!.city}, ${order.deliveryAddress!.state} - ${order.deliveryAddress!.pincode}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ] else if (order.pickupDetails != null) ...[
                      Text(
                        order.pickupDetails!.storeName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        order.pickupDetails!.storeAddress,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.pickupDetails!.pickupInstructions,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.lg),

            // Items Summary
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Order Items',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    const Divider(height: 16),
                    ...order.items.map(
                      (item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                '${item.quantity}x ${item.name} (${item.unit})',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            Text(
                              CurrencyFormatter.format(item.lineSubtotal),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Items Subtotal:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        Text(CurrencyFormatter.format(order.subtotal), style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Delivery Fee:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        Text(
                          order.deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(order.deliveryFee),
                          style: TextStyle(
                            fontSize: 12,
                            color: order.deliveryFee == 0 ? Colors.green[700] : AppColors.textPrimary,
                            fontWeight: order.deliveryFee == 0 ? FontWeight.w700 : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        Text(
                          CurrencyFormatter.format(order.totalAmount),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.xl),

            // Bottom Buttons
            ElevatedButton(
              onPressed: () {
                context.go('/orders');
              },
              child: const Text('View All Orders'),
            ),
            const SizedBox(height: AppDimensions.sm),
            OutlinedButton(
              onPressed: () {
                context.go('/');
              },
              child: const Text('Continue Shopping'),
            ),
          ],
        ),
      ),
    );
  }
}
