import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifications = [
      {
        'title': 'Order Dispatched!',
        'body': 'Your order KS-202610-0094 is out for delivery with our delivery partner.',
        'time': '10 mins ago',
        'icon': Icons.local_shipping_outlined,
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
        'title': 'Order KS-202610-0089 Delivered',
        'body': 'Your grocery delivery has been completed. Thank you for shopping local!',
        'time': 'Yesterday',
        'icon': Icons.check_circle_outline,
        'unread': false,
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppDimensions.lg),
        itemCount: notifications.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = notifications[index];
          final isUnread = item['unread'] as bool;

          return Card(
            color: isUnread ? Colors.white : AppColors.surfaceVariant.withValues(alpha: 0.5),
            shape: RoundedRectangleBorder(
              side: BorderSide(
                color: isUnread ? AppColors.primary.withValues(alpha: 0.5) : AppColors.border,
                width: 1,
              ),
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            ),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isUnread ? AppColors.primaryContainer : AppColors.surfaceVariant,
                child: Icon(item['icon'] as IconData, color: AppColors.primary, size: 20),
              ),
              title: Text(
                item['title'] as String,
                style: TextStyle(
                  fontWeight: isUnread ? FontWeight.w800 : FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 2),
                  Text(item['body'] as String, style: const TextStyle(fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    item['time'] as String,
                    style: const TextStyle(fontSize: 10, color: AppColors.textTertiary),
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
