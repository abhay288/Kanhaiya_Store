import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../data/admin_analytics_repository.dart';
import '../../domain/models/analytics_models.dart';
import 'admin_reports_screen.dart';
import 'admin_customers_screen.dart';

class AdminAnalyticsDashboardScreen extends ConsumerStatefulWidget {
  const AdminAnalyticsDashboardScreen({super.key});

  @override
  ConsumerState<AdminAnalyticsDashboardScreen> createState() =>
      _AdminAnalyticsDashboardScreenState();
}

class _AdminAnalyticsDashboardScreenState
    extends ConsumerState<AdminAnalyticsDashboardScreen> {
  String _selectedRange = 'last30days';
  bool _isLoading = true;
  String? _errorMessage;

  AnalyticsOverviewModel? _overview;
  SalesAnalyticsModel? _sales;

  final List<Map<String, String>> _ranges = [
    {'key': 'today', 'label': 'Today'},
    {'key': 'yesterday', 'label': 'Yesterday'},
    {'key': 'last7days', 'label': 'Last 7 Days'},
    {'key': 'last30days', 'label': 'Last 30 Days'},
    {'key': 'thismonth', 'label': 'Current Month'},
    {'key': 'lastmonth', 'label': 'Previous Month'},
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final overviewFuture = repo.getOverview(_selectedRange);
      final salesFuture = repo.getSalesAnalytics(_selectedRange);

      final overviewData = await overviewFuture;
      final salesData = await salesFuture;

      if (mounted) {
        setState(() {
          _overview = overviewData;
          _sales = salesData;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _exportCsv(String reportType) async {
    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final csv = await repo.exportReportCsv(reportType, range: _selectedRange);
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text('Export $reportType Report (CSV)'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Report generated successfully with Formula Injection protection:'),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      csv.length > 500 ? '${csv.substring(0, 500)}...\n[Truncated for display]' : csv,
                      style: const TextStyle(fontSize: 10, fontFamily: 'monospace'),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Business Analytics & KPIs'),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          PopupMenuButton<String>(
            tooltip: 'Export Reports',
            icon: const Icon(Icons.file_download_outlined),
            onSelected: _exportCsv,
            itemBuilder: (ctx) => const [
              PopupMenuItem(value: 'sales', child: Text('Export Sales Summary (CSV)')),
              PopupMenuItem(value: 'orders', child: Text('Export Orders Report (CSV)')),
              PopupMenuItem(value: 'products', child: Text('Export Product Performance (CSV)')),
              PopupMenuItem(value: 'inventory', child: Text('Export Inventory Status (CSV)')),
              PopupMenuItem(value: 'customers', child: Text('Export Customer Directory (CSV)')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date Range Filter Selector
              _buildDateRangeSelector(),
              const SizedBox(height: 12),

              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                )
              else if (_errorMessage != null)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.lg),
                    child: Column(
                      children: [
                        const Icon(Icons.error_outline, size: 40, color: AppColors.error),
                        const SizedBox(height: 8),
                        Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.error)),
                        const SizedBox(height: 12),
                        ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              else ...[
                // Quick Navigation Hub
                _buildNavigationHub(),
                const SizedBox(height: 16),

                // Financial Overview Section
                const Text('Financial & Order Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                _buildKpiGrid(),
                const SizedBox(height: 16),

                // Sales & Payment Breakdowns
                if (_sales != null) ...[
                  const Text('Payment & Fulfillment Channels', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  _buildBreakdownCards(),
                  const SizedBox(height: 16),

                  // Sales Trends Timeline
                  const Text('Daily Order Performance Trend', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
                  const SizedBox(height: 8),
                  _buildTimelineCard(),
                  const SizedBox(height: 16),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateRangeSelector() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: _ranges.map((r) {
            final isSelected = _selectedRange == r['key'];
            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                label: Text(r['label']!),
                selected: isSelected,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                ),
                onSelected: (val) {
                  if (val) {
                    setState(() => _selectedRange = r['key']!);
                    _loadData();
                  }
                },
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildNavigationHub() {
    return Row(
      children: [
        Expanded(
          child: _buildActionTile(
            'Product Reports',
            'Bestsellers & zero sales',
            Icons.bar_chart,
            AppColors.primary,
            () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => AdminReportsScreen(initialTab: 0, range: _selectedRange)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildActionTile(
            'Inventory Reports',
            'Replenish & expiry',
            Icons.warehouse_outlined,
            Colors.indigo,
            () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => AdminReportsScreen(initialTab: 1, range: _selectedRange)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildActionTile(
            'Customer Directory',
            'Spend & order history',
            Icons.people_alt_outlined,
            AppColors.accent,
            () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AdminCustomersScreen()),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionTile(String title, String subtitle, IconData icon, Color color, VoidCallback onTap) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: color.withValues(alpha: 0.12),
                  child: Icon(icon, color: color, size: 16),
                ),
                const SizedBox(height: 6),
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                Text(subtitle, style: const TextStyle(fontSize: 9, color: AppColors.textSecondary), maxLines: 1),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildKpiGrid() {
    final o = _overview!;
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      children: [
        _buildMetricCard('Gross Order Value', CurrencyFormatter.format(o.grossOrderValue), AppColors.primary, subtitle: 'Excludes cancelled'),
        _buildMetricCard('Verified Payments', CurrencyFormatter.format(o.verifiedPayments), Colors.green.shade800, subtitle: 'Actual funds received'),
        _buildMetricCard('Pending Payments', CurrencyFormatter.format(o.pendingPayments), Colors.amber.shade800, subtitle: 'Awaiting QR / COD'),
        _buildMetricCard('Total Orders', '${o.totalOrders}', AppColors.textPrimary, subtitle: '${o.ordersToday} placed today'),
        _buildMetricCard('Awaiting Confirm', '${o.awaitingConfirmation}', Colors.orange.shade700, subtitle: 'New Placed orders'),
        _buildMetricCard('Completed Orders', '${o.completedOrders}', Colors.teal.shade700, subtitle: '${o.cancelledOrders} cancelled'),
        _buildMetricCard('Low / Out Stock', '${o.lowStockCount} / ${o.outOfStockCount}', AppColors.error, subtitle: 'Require reordering'),
        _buildMetricCard('Active Customers', '${o.totalCustomers}', Colors.blue.shade700, subtitle: '${o.totalActiveProducts} catalog items'),
      ],
    );
  }

  Widget _buildMetricCard(String title, String value, Color color, {String? subtitle}) {
    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: color)),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ],
      ),
    );
  }

  Widget _buildBreakdownCards() {
    final s = _sales!;
    final cod = s.paymentMethods['COD'] as Map<String, dynamic>? ?? {'count': 0, 'amount': 0};
    final qr = s.paymentMethods['WHATSAPP_QR'] as Map<String, dynamic>? ?? {'count': 0, 'amount': 0};
    final del = s.fulfillmentMethods['DELIVERY'] as Map<String, dynamic>? ?? {'count': 0, 'amount': 0};
    final pic = s.fulfillmentMethods['PICKUP'] as Map<String, dynamic>? ?? {'count': 0, 'amount': 0};

    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppDimensions.md),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Payment Channels', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                const Divider(height: 16),
                _buildChannelRow('COD', '${cod['count']} ord', CurrencyFormatter.format(cod['amount'] as num)),
                const SizedBox(height: 8),
                _buildChannelRow('WhatsApp QR', '${qr['count']} ord', CurrencyFormatter.format(qr['amount'] as num)),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(AppDimensions.md),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Fulfillment Methods', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                const Divider(height: 16),
                _buildChannelRow('Delivery', '${del['count']} ord', CurrencyFormatter.format(del['amount'] as num)),
                const SizedBox(height: 8),
                _buildChannelRow('In-Store Pickup', '${pic['count']} ord', CurrencyFormatter.format(pic['amount'] as num)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChannelRow(String label, String count, String amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
            Text(count, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
          ],
        ),
        Text(amount, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primary)),
      ],
    );
  }

  Widget _buildTimelineCard() {
    final s = _sales!;
    if (s.timeline.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
        child: const Center(child: Text('No orders in this period', style: TextStyle(color: Colors.grey))),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: s.timeline.map((point) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 12, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Text(point.date, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                      child: Text('${point.orderCount} orders', style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                    ),
                  ],
                ),
                Text(CurrencyFormatter.format(point.grossValue), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.primary)),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
