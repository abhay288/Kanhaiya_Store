import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/notification_repository.dart';
import '../../domain/models/notification_item_model.dart';

class NotificationsNotifier extends AsyncNotifier<List<NotificationItemModel>> {
  NotificationRepository get _repo => notificationRepository;

  @override
  Future<List<NotificationItemModel>> build() async {
    return _fetch();
  }

  Future<List<NotificationItemModel>> _fetch() async {
    final authState = ref.watch(authProvider);
    final userPhone = authState.user?.phoneNumber;
    final isAdmin = authState.isAdmin;

    try {
      final items = await _repo.getNotifications(phone: userPhone, admin: isAdmin);
      if (items.isNotEmpty) {
        return items;
      }
    } catch (_) {
      // Graceful fallback to default store operational notices
    }

    return _defaultNotifications();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetch());
  }

  Future<void> markAsRead(String id) async {
    final current = state.value ?? [];
    state = AsyncValue.data(
      current.map((item) => item.id == id ? item.copyWith(isRead: true) : item).toList(),
    );

    try {
      await _repo.markAsRead(id);
    } catch (_) {
      // Local optimistic update kept
    }
  }

  Future<void> markAllAsRead() async {
    final current = state.value ?? [];
    final ids = current.where((n) => !n.isRead).map((n) => n.id).toList();

    state = AsyncValue.data(
      current.map((item) => item.copyWith(isRead: true)).toList(),
    );

    try {
      final authState = ref.read(authProvider);
      await _repo.markAllAsRead(phone: authState.user?.phoneNumber, ids: ids);
    } catch (_) {
      // Local optimistic update kept
    }
  }

  List<NotificationItemModel> _defaultNotifications() {
    final now = DateTime.now();
    return [
      NotificationItemModel(
        id: 'welcome_1',
        title: 'Welcome to Kanhaiya General Store! 🛒',
        message: 'Order fresh groceries, staples, and daily essentials online for instant counter pickup at Sarvankhera.',
        type: 'ORDER_PLACED',
        isRead: false,
        createdAt: now.subtract(const Duration(minutes: 15)),
      ),
      NotificationItemModel(
        id: 'promo_1',
        title: 'Pure Desi Ghee & Fresh Oil Available',
        message: 'Restocked today with authentic brands. Counter pickup ready in 15 minutes at Fatehpur Roshnai.',
        type: 'ORDER_CONFIRMED',
        isRead: false,
        createdAt: now.subtract(const Duration(hours: 2)),
      ),
      NotificationItemModel(
        id: 'info_1',
        title: 'Fast Counter Pickup Instructions',
        message: 'Show your order ID or phone number at the counter for contactless payment & direct packaging.',
        type: 'ORDER_READY',
        isRead: true,
        createdAt: now.subtract(const Duration(days: 1)),
      ),
    ];
  }
}

final notificationsNotifierProvider =
    AsyncNotifierProvider<NotificationsNotifier, List<NotificationItemModel>>(
  NotificationsNotifier.new,
);

final unreadNotificationCountProvider = Provider<int>((ref) {
  final asyncValue = ref.watch(notificationsNotifierProvider);
  return asyncValue.value?.where((n) => !n.isRead).length ?? 0;
});
