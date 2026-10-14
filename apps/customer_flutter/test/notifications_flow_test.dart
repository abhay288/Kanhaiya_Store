import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_flutter/features/notifications/domain/models/notification_item_model.dart';
import 'package:customer_flutter/features/notifications/presentation/controllers/notification_controller.dart';

void main() {
  group('Notifications Flow & Bell Icon State Suite', () {
    test('NotificationItemModel properly parses JSON payload and calculates timeAgo', () {
      final json = {
        '_id': 'notif_100',
        'title': 'Order Ready for Pickup',
        'message': 'Your order KS-202610-0094 is packed and ready.',
        'type': 'ORDER_READY',
        'orderNumber': 'KS-202610-0094',
        'isRead': false,
        'createdAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
      };

      final model = NotificationItemModel.fromJson(json);

      expect(model.id, 'notif_100');
      expect(model.title, 'Order Ready for Pickup');
      expect(model.isRead, false);
      expect(model.isOrderRelated, true);
      expect(model.timeAgo, '5 mins ago');
    });

    test('unreadNotificationCountProvider calculates unread items accurately', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Trigger read of notifications list
      final initialList = await container.read(notificationsNotifierProvider.future);
      expect(initialList.isNotEmpty, true);

      final unreadCount = container.read(unreadNotificationCountProvider);
      final manualCount = initialList.where((n) => !n.isRead).length;

      expect(unreadCount, manualCount);

      // Mark all as read
      await container.read(notificationsNotifierProvider.notifier).markAllAsRead();
      final updatedUnreadCount = container.read(unreadNotificationCountProvider);

      expect(updatedUnreadCount, 0);
    });

    test('markAsRead single item marks specified notification as read', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final list = await container.read(notificationsNotifierProvider.future);
      final unreadItem = list.firstWhere((n) => !n.isRead);

      await container.read(notificationsNotifierProvider.notifier).markAsRead(unreadItem.id);
      final updatedList = await container.read(notificationsNotifierProvider.future);
      final updatedItem = updatedList.firstWhere((n) => n.id == unreadItem.id);

      expect(updatedItem.isRead, true);
    });
  });
}
