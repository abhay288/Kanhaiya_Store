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
    final authState = ref.read(authProvider);
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
      return state.value ?? [];
    }
  }

  Future<void> refresh({bool silent = false}) async {
    if (!silent && (state.value == null || state.value!.isEmpty)) {
      state = const AsyncValue.loading();
    }
    final fresh = await _fetch();
    state = AsyncValue.data(fresh);
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

  /// Delete a single notification permanently
  Future<void> deleteNotification(String id) async {
    final current = state.value ?? [];
    state = AsyncValue.data(
      current.where((item) => item.id != id).toList(),
    );

    try {
      await _repo.deleteNotification(id);
    } catch (_) {
      // Optimistic update retained
    }
  }

  /// Delete all notifications permanently
  Future<void> clearAllNotifications() async {
    state = const AsyncValue.data([]);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_readIdsKey);
    } catch (_) {}

    try {
      final authState = ref.read(authProvider);
      await _repo.clearAllNotifications(
        phone: authState.user?.phoneNumber,
        admin: authState.isAdmin,
      );
    } catch (_) {
      // Optimistic update retained
    }
  }

  /// Broadcast a store announcement to all customers (Admin only)
  Future<NotificationItemModel> broadcastNotification({
    required String title,
    required String message,
    String? type,
  }) async {
    final created = await _repo.broadcastNotification(
      title: title,
      message: message,
      type: type,
    );
    final current = state.value ?? [];
    state = AsyncValue.data([created, ...current]);
    return created;
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
