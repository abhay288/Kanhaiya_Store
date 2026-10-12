import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../data/admin_analytics_repository.dart';
import '../../domain/models/analytics_models.dart';
import 'admin_categories_screen.dart';
import 'admin_product_edit_screen.dart';
import 'admin_products_screen.dart';
import 'admin_inventory_dashboard_screen.dart';
import 'admin_orders_screen.dart';
import 'admin_analytics_dashboard_screen.dart';
import 'admin_reports_screen.dart';
import 'admin_customers_screen.dart';
import 'admin_store_settings_screen.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  AnalyticsOverviewModel? _metrics;
  bool _isLoadingMetrics = true;

  @override
  void initState() {
    super.initState();
    _fetchLiveMetrics();
  }

  Future<void> _fetchLiveMetrics() async {
    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final data = await repo.getOverview('today');
      if (mounted) {
        setState(() {
          _metrics = data;
          _isLoadingMetrics = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingMetrics = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

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
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: Image.asset(
                'assets/images/kgs_logo.png',
                width: 24,
                height: 24,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 8),
            const Text('Store Admin Center'),
          ],
        ),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Store Operating Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AdminStoreSettingsScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchLiveMetrics,
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
              // Admin Identity Card
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.shield, color: AppColors.secondary, size: 28),
                    const SizedBox(width: AppDimensions.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            authState.user?.displayName ?? 'Admin Operator',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                          Text(
                            'Authenticated as: ${authState.user?.email}',
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppDimensions.md),

              // Operational Metrics Grid (Live Data from Phase 8 API)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Today\'s Store Pulse', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                  if (_isLoadingMetrics)
                    const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: AppDimensions.sm),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                children: [
                  _buildMetricCard(
                    'Orders Today',
                    _metrics != null ? '${_metrics!.ordersToday}' : '...',
                    AppColors.primary,
                  ),
                  _buildMetricCard(
                    'Awaiting Action',
                    _metrics != null ? '${_metrics!.awaitingConfirmation}' : '...',
                    AppColors.warning,
                  ),
                  _buildMetricCard(
                    'Collected Today',
                    _metrics != null ? CurrencyFormatter.format(_metrics!.verifiedPayments) : '...',
                    AppColors.secondary,
                  ),
                  _buildMetricCard(
                    'Low / Out Stock',
                    _metrics != null ? '${_metrics!.lowStockCount + _metrics!.outOfStockCount}' : '...',
                    AppColors.error,
                  ),
                ],
              ),
              const SizedBox(height: AppDimensions.lg),

              // Section 1: Analytics & Reports (Phase 8)
              const Text(
                'Analytics, Reports & Settings (Phase 8)',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Row(
                children: [
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Business Analytics',
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
                      title: 'Store Reports & Audits',
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
                      title: 'Customer Directory',
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
                      title: 'Store Settings',
                      subtitle: 'Delivery rules, checkout, alerts & GSTIN',
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

              // Section 2: Order Fulfillment & Invoices (Phase 7)
              const Text(
                'Order Fulfillment & Invoices (Phase 7)',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
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
                  title: const Text(
                    'Order Operations Dashboard',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
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

              // Section 3: Catalog & Inventory Management Center (Phase 3 & 4)
              const Text(
                'Catalog & Inventory Management (Phase 3 & 4)',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppDimensions.sm),

              Row(
                children: [
                  Expanded(
                    child: _buildActionTile(
                      context,
                      title: 'Manage Products',
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
                      title: 'Manage Categories',
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

              // Inventory & Stock Control Card (Phase 4)
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
                  title: const Text(
                    'Inventory & Stock Control (Phase 4)',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textPrimary),
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
                  title: const Text(
                    'Add New Catalog Item',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.onPrimaryContainer),
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
