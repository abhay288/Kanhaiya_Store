import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/notification_repository.dart';
import '../../domain/models/notification_item_model.dart';

class NotificationsNotifier extends AsyncNotifier<List<NotificationItemModel>> {
  NotificationRepository get _repo => notificationRepository;
  static const String _readIdsKey = 'kgs_read_notification_ids';

  @override
  Future<List<NotificationItemModel>> build() async {
    return _fetch();
  }

  Future<Set<String>> _getLocalReadIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList(_readIdsKey) ?? [];
      return list.toSet();
    } catch (_) {
      return {};
    }
  }

  Future<void> _saveLocalReadIds(Set<String> readIds) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_readIdsKey, readIds.toList());
    } catch (_) {}
  }

  Future<List<NotificationItemModel>> _fetch() async {
    final authState = ref.watch(authProvider);
    final userPhone = authState.user?.phoneNumber;
    final isAdmin = authState.isAdmin;
    final readIds = await _getLocalReadIds();

    try {
      final items = await _repo.getNotifications(phone: userPhone, admin: isAdmin);
      return items.map((item) {
        if (readIds.contains(item.id)) {
          return item.copyWith(isRead: true);
        }
        return item;
      }).toList();
    } catch (_) {
      return [];
    }
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

    // Save locally to SharedPreferences so it persists when returning or reopening the app
    final readIds = await _getLocalReadIds();
    readIds.add(id);
    await _saveLocalReadIds(readIds);

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

    // Persist all IDs in local storage
    final readIds = await _getLocalReadIds();
    readIds.addAll(current.map((n) => n.id));
    await _saveLocalReadIds(readIds);

    try {
      final authState = ref.read(authProvider);
      await _repo.markAllAsRead(phone: authState.user?.phoneNumber, ids: ids);
    } catch (_) {
      // Local optimistic update kept
    }
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
