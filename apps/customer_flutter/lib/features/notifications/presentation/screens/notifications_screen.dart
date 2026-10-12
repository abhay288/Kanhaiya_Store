import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifications = [
      {
        'title': 'Order Ready for Pickup!',
        'body': 'Your order KS-202610-0094 is packed and ready for pickup at the store counter.',
        'time': '10 mins ago',
        'icon': Icons.storefront_outlined,
        'unread': true,
      },
      {
        'title': 'Fresh Ghee Stock Arrived',
        'body': 'Amul Pure Cow Ghee (1 L) is back in stock at wholesale price ₹615.',
        'time': '2 hours ago',
        'icon': Icons.inventory_2_outlined,
        'unread': false,
      },
      {
        'title': 'Order KS-202610-0089 Picked Up',
        'body': 'Your grocery pickup has been completed. Thank you for shopping with Kanhaiya General Store!',
        'time': 'Yesterday',
        'icon': Icons.check_circle_outline,
        'unread': false,
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset('assets/images/kgs_logo.png', width: 26, height: 26),
            ),
            const SizedBox(width: 8),
            const Text('Notifications'),
          ],
        ),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppDimensions.lg),
        itemCount: notifications.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = notifications[index];
          final isUnread = item['unread'] as bool;

          return Card(
            elevation: isUnread ? 2 : 0,
            color: isUnread ? Colors.white : AppColors.surfaceVariant.withValues(alpha: 0.5),
            shape: RoundedRectangleBorder(
              side: BorderSide(
                color: isUnread ? AppColors.primary.withValues(alpha: 0.6) : AppColors.border,
                width: isUnread ? 1.5 : 1,
              ),
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppDimensions.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Official Store Branding Logo Avatar
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: AppColors.primary, width: 1.5),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Padding(
                      padding: const EdgeInsets.all(4.0),
                      child: Image.asset('assets/images/kgs_logo.png', fit: BoxFit.contain),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Content with Sender Badge
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primaryContainer.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'Kanhaiya General Store',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                            Text(
                              item['time'] as String,
                              style: const TextStyle(fontSize: 10, color: AppColors.textTertiary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          item['title'] as String,
                          style: TextStyle(
                            fontWeight: isUnread ? FontWeight.w800 : FontWeight.w600,
                            fontSize: 13,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item['body'] as String,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3),
                        ),
                      ],
                    ),
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
