import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../data/admin_analytics_repository.dart';

class AdminReportsScreen extends ConsumerStatefulWidget {
  final int initialTab;
  final String range;

  const AdminReportsScreen({
    super.key,
    this.initialTab = 0,
    this.range = 'last30days',
  });

  @override
  ConsumerState<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends ConsumerState<AdminReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late String _currentRange;

  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic> _productReport = {};
  Map<String, dynamic> _inventoryReport = {};
  Map<String, dynamic> _orderReport = {};

  @override
  void initState() {
    super.initState();
    _currentRange = widget.range;
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialTab);
    _loadReportData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReportData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final productsFuture = repo.getProductReports(_currentRange, limit: 50);
      final inventoryFuture = repo.getInventoryReports(_currentRange);
      final ordersFuture = repo.getOrderReports(_currentRange);

      final pData = await productsFuture;
      final iData = await inventoryFuture;
      final oData = await ordersFuture;

      if (mounted) {
        setState(() {
          _productReport = pData;
          _inventoryReport = iData;
          _orderReport = oData;
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

  Future<void> _exportCurrentTabCsv() async {
    final type = _tabController.index == 0
        ? 'products'
        : _tabController.index == 1
            ? 'inventory'
            : 'orders';
    try {
      final repo = ref.read(adminAnalyticsRepositoryProvider);
      final csv = await repo.exportReportCsv(type, range: _currentRange);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$type CSV generated (${csv.length} bytes) with formula injection protection.'),
            backgroundColor: AppColors.primary,
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
        title: const Text('Store Reports & Audits'),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'Export Current Report (CSV)',
            onPressed: _exportCurrentTabCsv,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReportData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.secondary,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Products'),
            Tab(text: 'Inventory'),
            Tab(text: 'Orders & Pay'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 40, color: AppColors.error),
                      const SizedBox(height: 8),
                      Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _loadReportData, child: const Text('Retry')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildProductsTab(),
                    _buildInventoryTab(),
                    _buildOrdersTab(),
                  ],
                ),
    );
  }

  Widget _buildProductsTab() {
    final products = _productReport['products'] as List<dynamic>? ?? [];
    final zeroSalesCount = _productReport['zeroSalesCount'] ?? 0;
    final categories = _productReport['categoryPerformance'] as List<dynamic>? ?? [];

    return ListView(
      padding: const EdgeInsets.all(AppDimensions.md),
      children: [
        // Category Sales Summary
        if (categories.isNotEmpty) ...[
          const Text('Category Revenue Ranking', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 6),
          SizedBox(
            height: 70,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (ctx, idx) {
                final c = categories[idx] as Map<String, dynamic>;
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade200)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(c['category'] ?? '', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      Text(CurrencyFormatter.format(c['revenue'] as num), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Product Performance Snapshot', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
            Text('Zero Sales: $zeroSalesCount items', style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 8),

        ...products.map((p) {
          final isZero = (p['quantitySold'] as num? ?? 0) == 0;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            elevation: 0.5,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            child: Padding(
              padding: const EdgeInsets.all(AppDimensions.md),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        Text('${p['categoryName'] ?? ""} • Price: ${CurrencyFormatter.format(p['sellingPrice'] as num? ?? 0)}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        const SizedBox(height: 2),
                        Text('In Stock: ${p['currentStock'] ?? 0} units', style: TextStyle(fontSize: 10, color: (p['currentStock'] as num? ?? 0) <= 5 ? AppColors.error : AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        isZero ? '0 Sold' : '${p['quantitySold']} sold',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: isZero ? Colors.grey : AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        CurrencyFormatter.format(p['totalRevenue'] as num? ?? 0),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppColors.primary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildInventoryTab() {
    final suggestions = _inventoryReport['replenishmentSuggestions'] as List<dynamic>? ?? [];
    final expiryList = _inventoryReport['expiryList'] as List<dynamic>? ?? [];
    final movements = _inventoryReport['movementSummary'] as Map<String, dynamic>? ?? {};

    return ListView(
      padding: const EdgeInsets.all(AppDimensions.md),
      children: [
        // Movements summary row
        const Text('Stock Activity in Period', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildMovementBadge('Receipts', movements['PURCHASE_RECEIPT']?['totalQuantity'] ?? 0, Colors.green),
              _buildMovementBadge('Damaged', movements['DAMAGED_EXPIRED']?['totalQuantity'] ?? 0, AppColors.error),
              _buildMovementBadge('Fulfillments', movements['ORDER_FULFILLMENT']?['totalQuantity'] ?? 0, Colors.blue),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Replenishment suggestions
        Text('Replenishment Suggestions (${suggestions.length})', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        if (suggestions.isEmpty)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Text('All products are adequately stocked.', style: TextStyle(color: Colors.grey)),
          )
        else
          ...suggestions.map((s) {
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppColors.error.withValues(alpha: 0.1),
                  child: const Icon(Icons.add_shopping_cart, color: AppColors.error, size: 20),
                ),
                title: Text(s['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: Text('Current: ${s['currentStock']} • Threshold: ${s['threshold']}', style: const TextStyle(fontSize: 11)),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Reorder', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                    Text('+${s['suggestedReorder']} units', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
                  ],
                ),
              ),
            );
          }),

        const SizedBox(height: 16),

        // Expiry alerts
        Text('Batch Expiry Tracking (${expiryList.length})', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        if (expiryList.isEmpty)
          const Padding(
            padding: EdgeInsets.all(12),
            child: Text('No expired or near-expiry batches detected.', style: TextStyle(color: Colors.grey)),
          )
        else
          ...expiryList.map((e) {
            final isExpired = e['status'] == 'EXPIRED';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: (isExpired ? AppColors.error : Colors.amber).withValues(alpha: 0.15),
                  child: Icon(Icons.event_busy, color: isExpired ? AppColors.error : Colors.amber.shade800, size: 20),
                ),
                title: Text(e['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: Text('Batch: ${e['batchNumber']} • Stock: ${e['stock']}', style: const TextStyle(fontSize: 11)),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isExpired ? AppColors.error : Colors.amber.shade800).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    e['status'] ?? '',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: isExpired ? AppColors.error : Colors.amber.shade900,
                    ),
                  ),
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildMovementBadge(String label, dynamic count, Color color) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }

  Widget _buildOrdersTab() {
    final statusCounts = _orderReport['statusCounts'] as Map<String, dynamic>? ?? {};
    final totalAmount = _orderReport['totalAmount'] ?? 0;
    final verifiedAmount = _orderReport['verifiedAmount'] ?? 0;
    final pendingCod = _orderReport['pendingCodAmount'] ?? 0;
    final pendingQr = _orderReport['pendingWhatsappQrAmount'] ?? 0;

    return ListView(
      padding: const EdgeInsets.all(AppDimensions.md),
      children: [
        // Financial summary cards
        Container(
          padding: const EdgeInsets.all(AppDimensions.md),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Collections & Verification Audit', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
              const Divider(height: 16),
              _buildAuditRow('Total Billed Value', CurrencyFormatter.format(totalAmount as num), AppColors.textPrimary),
              _buildAuditRow('Verified Funds Received', CurrencyFormatter.format(verifiedAmount as num), Colors.green.shade800),
              _buildAuditRow('Pending WhatsApp QR Verification', CurrencyFormatter.format(pendingQr as num), Colors.amber.shade800),
              _buildAuditRow('Pending COD Cash Collection', CurrencyFormatter.format(pendingCod as num), Colors.blue.shade800),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Status breakdown
        const Text('Orders Breakdown by Status', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(AppDimensions.md),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
          child: Column(
            children: statusCounts.entries.map((e) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(e.key.replaceAll('_', ' '), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                      child: Text('${e.value}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAuditRow(String label, String amount, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          Text(amount, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color)),
        ],
      ),
    );
  }
}
