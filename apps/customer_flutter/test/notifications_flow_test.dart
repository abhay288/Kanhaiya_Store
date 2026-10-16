import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_flutter/features/notifications/domain/models/notification_item_model.dart';
import 'package:customer_flutter/features/notifications/presentation/controllers/notification_controller.dart';
import 'package:customer_flutter/features/notifications/presentation/widgets/broadcast_notification_dialog.dart';

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

    test('unreadNotificationCountProvider defaults cleanly without active network', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final count = container.read(unreadNotificationCountProvider);
      expect(count >= 0, true);
    });

    test('NotificationItemModel handles copyWith correctly', () {
      final item = NotificationItemModel(
        id: 'n1',
        title: 'Discount Announcement',
        message: '10% off today',
        type: 'STORE_ANNOUNCEMENT',
        isRead: false,
        createdAt: DateTime.now(),
      );

      final readItem = item.copyWith(isRead: true);
      expect(readItem.isRead, true);
      expect(readItem.title, 'Discount Announcement');
    });

    testWidgets('showBroadcastNotificationDialog renders Cancel and Send Broadcast buttons', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => Consumer(
                  builder: (context, ref, _) => ElevatedButton(
                    onPressed: () => showBroadcastNotificationDialog(context, ref),
                    child: const Text('Open Dialog'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Dialog'));
      await tester.pumpAndSettle();

      expect(find.text('Broadcast Push Notification'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Send Broadcast'), findsOneWidget);
      expect(find.byIcon(Icons.send_rounded), findsOneWidget);
    });
  });
}
