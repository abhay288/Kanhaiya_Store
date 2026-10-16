import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/admin_analytics_repository.dart';
import '../../domain/models/analytics_models.dart';
import '../../../../core/network/api_error_handler.dart';
import 'admin_categories_screen.dart';
import 'admin_product_edit_screen.dart';
import 'admin_products_screen.dart';
import 'admin_inventory_dashboard_screen.dart';
import 'admin_orders_screen.dart';
import 'admin_analytics_dashboard_screen.dart';
import 'admin_reports_screen.dart';
import 'admin_customers_screen.dart';
import 'admin_store_settings_screen.dart';
import '../../../notifications/presentation/controllers/notification_controller.dart';
import '../../../notifications/presentation/screens/notifications_screen.dart';
import '../../../notifications/presentation/widgets/broadcast_notification_dialog.dart';
import '../../../../core/localization/app_language_provider.dart';
import '../../../../core/localization/app_strings.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  AnalyticsOverviewModel? _metrics;
  bool _isLoadingMetrics = true;
  String? _metricsError;
  Timer? _metricsTimer;

  @override
  void initState() {
    super.initState();
    _fetchLiveMetrics(silent: false);

    // Real-time synchronization: poll store metrics every 10 seconds
    _metricsTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) {
        _fetchLiveMetrics(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _metricsTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchLiveMetrics({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoadingMetrics = true;
        _metricsError = null;
      });
    }
    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final data = await repo.getOverview('today');
      if (mounted) {
        if (!silent ||
            _metrics == null ||
            _metrics?.ordersToday != data.ordersToday ||
            _metrics?.grossOrderValue != data.grossOrderValue ||
            _metrics?.awaitingConfirmation != data.awaitingConfirmation ||
            _metrics?.lowStockCount != data.lowStockCount ||
            _metrics?.totalOrders != data.totalOrders) {
          setState(() {
            _metrics = data;
            _isLoadingMetrics = false;
          });
        }
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _metricsError = ApiErrorHandler.getMessage(e);
          _isLoadingMetrics = false;
        });
      }
    }
  }

  Future<void> _handleAdminLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout, color: AppColors.error),
            SizedBox(width: 8),
            Text('Log Out of Admin?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Are you sure you want to end your administrator session? You will need to sign in again to access store management.',
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
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      ref.read(authProvider.notifier).signOut();
      if (!mounted) return;
      context.go('/home');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Logged out of Admin Panel successfully.'),
          duration: Duration(seconds: 2),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(appLanguageProvider);
    final authState = ref.watch(authProvider);
    final unreadNotificationCount = ref.watch(unreadNotificationCountProvider);
    final notificationsAsync = ref.watch(notificationsNotifierProvider);

    // Double security assertion
    if (!authState.isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Access Denied')),
        body: const Center(
          child: Text('403 Forbidden: Administrator credentials required.'),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        toolbarHeight: 64,
        title: Row(
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(2),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  'assets/images/kgs_logo.png',
                  width: 40,
                  height: 40,
                  fit: BoxFit.contain,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Kanhaiya General Store',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    'Store Admin Center'.tr(lang),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 1,
        actions: [
          // Language Switcher Badge
          InkWell(
            onTap: () => ref.read(appLanguageProvider.notifier).toggleLanguage(),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              margin: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white60, width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.language, size: 14, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    lang == 'hi' ? 'हिंदी' : 'EN',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Live Customer Order Alert Bell
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                tooltip: 'Customer Order Alerts',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  );
                },
              ),
              if (unreadNotificationCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      unreadNotificationCount > 9 ? '9+' : '$unreadNotificationCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.white),
            tooltip: 'Store Operating Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AdminStoreSettingsScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: 'Refresh metrics',
            onPressed: _fetchLiveMetrics,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            tooltip: 'Log Out of Admin Panel',
            onPressed: _handleAdminLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchLiveMetrics,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Live Customer Order Alert Banner (Shows only unread alerts with dismiss button)
              notificationsAsync.when(
                data: (notifications) {
                  // Only show alerts that have NOT yet been read
                  final alerts = notifications.where((n) => !n.isRead && (n.type == 'ADMIN_ALERT' || n.isOrderRelated)).toList();
                  if (alerts.isEmpty) return const SizedBox.shrink();
                  final latestAlert = alerts.first;
                  return Container(
                    margin: const EdgeInsets.only(bottom: AppDimensions.md),
                    padding: const EdgeInsets.all(AppDimensions.md),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFEF2F2), Color(0xFFFEE2E2)],
                      ),
                      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                      border: Border.all(color: const Color(0xFFF87171), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.notifications_active, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      latestAlert.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 14,
                                        color: Color(0xFF991B1B),
                                      ),
                                    ),
                                  ),
                                  Text(
                                    latestAlert.timeAgo,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFFB91C1C),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  InkWell(
                                    onTap: () {
                                      ref.read(notificationsNotifierProvider.notifier).markAsRead(latestAlert.id);
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: const Padding(
                                      padding: EdgeInsets.all(2.0),
                                      child: Icon(Icons.close, size: 16, color: Color(0xFFB91C1C)),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                latestAlert.message,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF7F1D1D),
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () {
                                  ref.read(notificationsNotifierProvider.notifier).markAsRead(latestAlert.id);
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                                  );
                                },
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'View all order alerts',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFFDC2626),
                                        decoration: TextDecoration.underline,
                                      ),
                                    ),
                                    SizedBox(width: 4),
                                    Icon(Icons.arrow_forward_ios, size: 10, color: Color(0xFFDC2626)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
                loading: () => const SizedBox.shrink(),
                error: (err, stack) => const SizedBox.shrink(),
              ),

              // Operational Metrics Header & Error State
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Today\'s Store Pulse', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                  if (_isLoadingMetrics)
                    const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: AppDimensions.sm),

              if (_metricsError != null)
                Container(
                  margin: const EdgeInsets.only(bottom: AppDimensions.sm),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.errorContainer,
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: AppColors.error, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _metricsError!,
                          style: const TextStyle(color: AppColors.error, fontSize: 12),
                        ),
                      ),
                      TextButton(
                        onPressed: _fetchLiveMetrics,
                        child: const Text('Retry', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.error)),
                      ),
                    ],
                  ),
                ),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                children: [
                  _buildMetricCard(
                    'Orders Today'.tr(lang),
                    _metrics != null
                        ? '${_metrics!.ordersToday}'
                        : (_isLoadingMetrics ? '...' : '0'),
                    AppColors.primary,
                  ),
                  _buildMetricCard(
                    'Awaiting Action'.tr(lang),
                    _metrics != null
                        ? '${_metrics!.awaitingConfirmation}'
                        : (_isLoadingMetrics ? '...' : '0'),
                    AppColors.warning,
                  ),
                  _buildMetricCard(
                    'Collected Today'.tr(lang),
                    _metrics != null
                        ? CurrencyFormatter.format(_metrics!.verifiedPayments)
                        : (_isLoadingMetrics ? '...' : CurrencyFormatter.format(0)),
                    AppColors.secondary,
                  ),
                  _buildMetricCard(
                    'Low / Out Stock'.tr(lang),
                    _metrics != null
                        ? '${_metrics!.lowStockCount + _metrics!.outOfStockCount}'
                        : (_isLoadingMetrics ? '...' : '0'),
                    AppColors.error,
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.lg),

              // Section 1: Analytics, Reports & Settings
              Text(
                'Business Analytics'.tr(lang),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Row(
                children: [
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Business Analytics'.tr(lang),
                      subtitle: 'KPIs, sales trends & payment channels',
                      icon: Icons.insights_outlined,
                      color: AppColors.primary,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminAnalyticsDashboardScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Store Reports & Audits'.tr(lang),
                      subtitle: 'Product ranking, stock replenishment & CSV',
                      icon: Icons.assessment_outlined,
                      color: Colors.indigo,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminReportsScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Customer Directory'.tr(lang),
                      subtitle: 'Customer spend & lifetime order history',
                      icon: Icons.people_outline,
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminCustomersScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Store Settings'.tr(lang),
                      subtitle: 'Store profile, checkout alerts & GSTIN',
                      icon: Icons.tune_outlined,
                      color: Colors.teal.shade700,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminStoreSettingsScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.lg),

              // Section: Push Notification Broadcast
              Text(
                'Broadcast Push Notifications'.tr(lang),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF1E3A8A),
                      AppColors.primary,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                    onTap: () => showBroadcastNotificationDialog(context, ref),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.campaign_rounded, color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Broadcast Push Notification'.tr(lang),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        'LIVE',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Send instant store announcements, festival discount offers & urgent notices directly to all customer smartphones.',
                                  style: TextStyle(color: Colors.white70, fontSize: 11, height: 1.3),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white70),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // Section 2: Order Fulfillment & Invoices
              Text(
                'Order Fulfillment & Invoices'.tr(lang),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primary,
                    child: Icon(Icons.assignment_outlined, color: Colors.white, size: 22),
                  ),
                  title: Text(
                    'Order Operations Dashboard'.tr(lang),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                  ),
                  subtitle: const Text(
                    'Manage fulfillment lifecycle, verify WhatsApp QR payments, collect COD & issue invoices',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.primary),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AdminOrdersScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // Section 3: Catalog & Inventory Management
              Text(
                'Catalog & Inventory Management'.tr(lang),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Row(
                children: [
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Manage Products'.tr(lang),
                      subtitle: 'CRUD, Cloudinary gallery, pricing & stock',
                      icon: Icons.inventory_2_outlined,
                      color: AppColors.primary,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminProductsScreen()),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Manage Categories'.tr(lang),
                      subtitle: 'Taxonomy, subcategories & icon imagery',
                      icon: Icons.category_outlined,
                      color: AppColors.accent,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AdminCategoriesScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Inventory & Stock Control Card
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  border: Border.all(color: AppColors.accent.withValues(alpha: 0.4)),
                ),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.accent,
                    child: Icon(Icons.warehouse_outlined, color: Colors.white, size: 20),
                  ),
                  title: Text(
                    'Inventory & Stock Control'.tr(lang),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
                  ),
                  subtitle: const Text(
                    'Real-time stock levels, movement audits, receipts, damaged goods & low-stock alerts',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.accent),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AdminInventoryDashboardScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),

              // Quick Add Product Card
              Container(
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primary,
                    child: Icon(Icons.add, color: Colors.white, size: 20),
                  ),
                  title: Text(
                    'Add New Catalog Item'.tr(lang),
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.onPrimaryContainer),
                  ),
                  subtitle: const Text(
                    'Upload images to Cloudinary, set selling price, pack size & stock',
                    style: TextStyle(fontSize: 11, color: AppColors.primaryDark),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.primary),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AdminProductEditScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(height: AppDimensions.lg),

              // Bottom Admin Session Controls
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _handleAdminLogout,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error, width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.logout, color: AppColors.error),
                  label: const Text('Log Out of Admin Panel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton.icon(
                  onPressed: () => context.go('/home'),
                  icon: const Icon(Icons.storefront_outlined, size: 16, color: AppColors.primary),
                  label: const Text('Switch to Customer Store View', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                ),
              ),
              const SizedBox(height: AppDimensions.xl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
          child: Padding(
            padding: const EdgeInsets.all(AppDimensions.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: color.withValues(alpha: 0.12),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(height: 10),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color),
          ),
        ],
      ),
    );
  }
}
