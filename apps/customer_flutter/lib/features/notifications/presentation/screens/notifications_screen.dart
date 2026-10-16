import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/widgets/feedback_views.dart';
import '../../../admin/presentation/screens/admin_order_details_screen.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../controllers/notification_controller.dart';
import '../../domain/models/notification_item_model.dart';
import '../widgets/broadcast_notification_dialog.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _activeFilter = 'all'; // 'all', 'unread', 'orders'

  Future<void> _confirmClearAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_sweep, color: AppColors.error),
            SizedBox(width: 8),
            Text('Clear All Notifications?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Are you sure you want to delete all notifications? This action cannot be undone.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clear All'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(notificationsNotifierProvider.notifier).clearAllNotifications();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('All notifications cleared'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _confirmDeleteNotification(NotificationItemModel item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: AppColors.error),
            SizedBox(width: 8),
            Text('Delete Notification?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Text(
          'Delete "${item.title}" permanently?',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(notificationsNotifierProvider.notifier).deleteNotification(item.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Notification deleted'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(notificationsNotifierProvider);
    final unreadCount = ref.watch(unreadNotificationCountProvider);
    final authState = ref.watch(authProvider);
    final hasNotifications = (notificationsAsync.value ?? []).isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 3,
                    offset: Offset(0, 1),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Image.asset('assets/images/kgs_logo.png', width: 30, height: 30),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Notifications',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                Text(
                  unreadCount > 0 ? '$unreadCount unread updates' : 'All caught up',
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (authState.isAdmin)
            IconButton(
              icon: const Icon(Icons.campaign_outlined, color: AppColors.primary),
              tooltip: 'Broadcast Push Notification',
              onPressed: () => showBroadcastNotificationDialog(context, ref),
            ),
          if (unreadCount > 0)
            TextButton.icon(
              icon: const Icon(Icons.done_all_rounded, size: 16, color: AppColors.primary),
              label: const Text(
                'Read All',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
              onPressed: () {
                ref.read(notificationsNotifierProvider.notifier).markAllAsRead();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('All notifications marked as read'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
          if (hasNotifications)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.error),
              tooltip: 'Clear All Notifications',
              onPressed: _confirmClearAll,
            ),
        ],
      ),
      floatingActionButton: authState.isAdmin
          ? FloatingActionButton.extended(
              onPressed: () => showBroadcastNotificationDialog(context, ref),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.campaign),
              label: const Text(
                'Broadcast Announcement',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
            )
          : null,
      body: Builder(
        builder: (context) {
          if (notificationsAsync.isLoading && notificationsAsync.value == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (notificationsAsync.hasError && notificationsAsync.value == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 40, color: AppColors.error),
                  const SizedBox(height: 12),
                  Text('Failed to load notifications: ${notificationsAsync.error}'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
                    child: const Text('Try Again'),
                  ),
                ],
              ),
            );
          }

          final items = notificationsAsync.value ?? [];
          final filtered = items.where((item) {
            if (_activeFilter == 'unread') return !item.isRead;
            if (_activeFilter == 'orders') return item.isOrderRelated;
            return true;
          }).toList();

          return Column(
            children: [
              // Filter Chips Row
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: AppDimensions.lg, vertical: 8),
                child: Row(
                  children: [
                    _buildFilterChip('All (${items.length})', 'all'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Unread ($unreadCount)', 'unread'),
                    const SizedBox(width: 8),
                    _buildFilterChip(
                      'Orders (${items.where((i) => i.isOrderRelated).length})',
                      'orders',
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Content List
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => ref.read(notificationsNotifierProvider.notifier).refresh(),
                  child: filtered.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                            EmptyView(
                              title: _activeFilter == 'unread'
                                  ? 'No Unread Notifications'
                                  : 'No Notifications Found',
                              description: _activeFilter == 'unread'
                                  ? 'You have read all updates! We will notify you when your next order is packed or ready.'
                                  : 'No updates in this section yet. Order updates and store notices will appear here.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          key: ValueKey('notif_list_$_activeFilter'),
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(AppDimensions.lg),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final item = filtered[index];
                            return _buildNotificationCard(item, authState);
                          },
                        ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _activeFilter == value;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      selected: isSelected,
      selectedColor: AppColors.primaryContainer,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.onPrimaryContainer : AppColors.textPrimary,
      ),
      onSelected: (_) {
        setState(() => _activeFilter = value);
      },
    );
  }

  Widget _buildNotificationCard(NotificationItemModel item, AuthState authState) {
    final isUnread = !item.isRead;

    return InkWell(
      key: ValueKey('card_${item.id}'),
      onTap: () {
        if (isUnread) {
          ref.read(notificationsNotifierProvider.notifier).markAsRead(item.id);
        }
        if (item.isOrderRelated) {
          final orderRef = item.orderNumber ?? item.orderId;
          if (authState.isAdmin) {
            if (orderRef != null && orderRef.isNotEmpty) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => AdminOrderDetailsScreen(orderId: orderRef),
                ),
              );
            }
          } else {
            if (orderRef != null && orderRef.isNotEmpty) {
              context.go('/orders?orderNumber=$orderRef');
            } else {
              context.go('/orders');
            }
          }
        }
      },
      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
      child: Card(
        elevation: isUnread ? 2 : 0,
        color: isUnread ? Colors.white : AppColors.surfaceVariant.withValues(alpha: 0.4),
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
              // Store Logo Avatar
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(
                    color: isUnread ? AppColors.primary : AppColors.border,
                    width: 1.5,
                  ),
                  boxShadow: const [
                    BoxShadow(color: Colors.black12, blurRadius: 3, offset: Offset(0, 1)),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: const EdgeInsets.all(3.0),
                  child: Image.asset('assets/images/kgs_logo.png', fit: BoxFit.contain),
                ),
              ),
              const SizedBox(width: 12),

              // Content Area
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
                            color: item.isOrderRelated
                                ? AppColors.accentContainer
                                : AppColors.primaryContainer.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.isOrderRelated
                                ? (item.orderNumber ?? 'Order Alert')
                                : 'Store Update',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: item.isOrderRelated
                                  ? AppColors.onAccentContainer
                                  : AppColors.primary,
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            if (isUnread) ...[
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                            ],
                            Text(
                              item.timeAgo,
                              style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => _confirmDeleteNotification(item),
                              borderRadius: BorderRadius.circular(12),
                              child: const Padding(
                                padding: EdgeInsets.all(2),
                                child: Icon(Icons.delete_outline, size: 16, color: Colors.grey),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.title,
                      style: TextStyle(
                        fontWeight: isUnread ? FontWeight.w800 : FontWeight.w600,
                        fontSize: 14,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.message,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                    if (item.isOrderRelated) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 14,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'Tap to view order details',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
