import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final mockOrders = [
      {
        'orderNo': 'KS-202610-0089',
        'date': '10 Oct 2026, 04:30 PM',
        'status': 'Delivered',
        'payment': 'COD',
        'total': 549.0,
        'items': ['Aashirvaad Shudh Chakki Atta (5 kg) x 1', 'Fortune Sunlite Sunflower Oil (1 L) x 2'],
      },
      {
        'orderNo': 'KS-202610-0094',
        'date': 'Today, 11:15 AM',
        'status': 'Out for Delivery',
        'payment': 'WhatsApp QR',
        'total': 382.0,
        'items': ['Tata Sampann Unpolished Toor Dal (1 kg) x 2', 'Tata Salt (1 kg) x 1'],
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('My Grocery Orders')),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppDimensions.lg),
        itemCount: mockOrders.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final ord = mockOrders[index];
          final isDelivered = ord['status'] == 'Delivered';

          return Card(
            child: Padding(
              padding: const EdgeInsets.all(AppDimensions.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ord['orderNo'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDelivered ? AppColors.primaryContainer : AppColors.secondaryContainer,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          ord['status'] as String,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isDelivered ? AppColors.onPrimaryContainer : AppColors.onSecondaryContainer,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    ord['date'] as String,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 20),
                  ...(ord['items'] as List<String>).map(
                    (it) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '• $it',
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                      ),
                    ),
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Paid via ${ord['payment']}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      Text(
                        CurrencyFormatter.format(ord['total'] as num),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppColors.primary,
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
    );
  }
}
