import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../catalog/domain/models/category_model.dart';
import '../../../catalog/domain/models/product_model.dart';
import '../../data/admin_catalog_repository.dart';
import '../../data/admin_inventory_repository.dart';
import '../../domain/models/inventory_alert_model.dart';
import '../../domain/models/inventory_summary_model.dart';
import '../../domain/models/stock_movement_model.dart';

class AdminInventoryDashboardScreen extends StatefulWidget {
  const AdminInventoryDashboardScreen({super.key});

  @override
  State<AdminInventoryDashboardScreen> createState() => _AdminInventoryDashboardScreenState();
}

class _AdminInventoryDashboardScreenState extends State<AdminInventoryDashboardScreen>
    with SingleTickerProviderStateMixin {
  final AdminInventoryRepository _invRepo = adminInventoryRepository;
  final AdminCatalogRepository _catRepo = adminCatalogRepository;

  late TabController _tabController;
  bool _isLoading = true;
  String? _errorMessage;

  // KPI Data
  InventorySummaryModel? _summary;

  // Products Tab State
  List<ProductModel> _products = [];
  List<CategoryModel> _categories = [];
  final TextEditingController _searchController = TextEditingController();
  String? _selectedCategory;
  String _selectedStatus = 'all'; // all, in_stock, low_stock, out_of_stock
  final String _selectedUnit = 'all';
  String _selectedSort = 'stock_asc'; // stock_asc, stock_desc, name_asc, updated_desc
  int _productsPage = 1;
  int _productsTotalPages = 1;
  int _productsTotalCount = 0;

  // Movements Tab State
  List<StockMovementModel> _movements = [];
  bool _movementsLoading = false;
  String? _movementTypeFilter;
  int _movementsPage = 1;
  int _movementsTotalPages = 1;

  // Alerts Tab State
  List<InventoryAlertModel> _alerts = [];
  bool _alertsLoading = false;
  String _alertStatusFilter = 'ACTIVE';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        if (_tabController.index == 1 && _movements.isEmpty) {
          _loadMovements();
        } else if (_tabController.index == 2 && _alerts.isEmpty) {
          _loadAlerts();
        }
      }
    });

    _initialLoad();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initialLoad() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final summaryFuture = _invRepo.getSummary();
      final categoriesFuture = _catRepo.getCategories(includeInactive: false);
      final results = await Future.wait([summaryFuture, categoriesFuture]);

      _summary = results[0] as InventorySummaryModel;
      _categories = results[1] as List<CategoryModel>;

      await _loadProducts();
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = ApiErrorHandler.getMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoading = true);
    try {
      String? inStockFilter;
      if (_selectedStatus == 'in_stock') inStockFilter = 'true';
      if (_selectedStatus == 'out_of_stock') inStockFilter = 'false';

      final res = await _catRepo.getProducts(
        page: _productsPage,
        limit: 15,
        search: _searchController.text.trim().isEmpty ? null : _searchController.text.trim(),
        categoryId: _selectedCategory,
        inStock: inStockFilter,
        sort: _selectedSort == 'stock_asc'
            ? 'stock_asc'
            : _selectedSort == 'stock_desc'
                ? 'stock_desc'
                : _selectedSort == 'name_asc'
                    ? 'name_asc'
                    : 'newest',
      );

      final List rawList = res['products'] as List;
      var loaded = rawList.map((j) => ProductModel.fromJson(j as Map<String, dynamic>)).toList();

      // In-memory filter for low-stock if selected
      if (_selectedStatus == 'low_stock') {
        loaded = loaded.where((p) => p.isLowStock).toList();
      }
      if (_selectedUnit != 'all') {
        loaded = loaded.where((p) => p.unit.toLowerCase() == _selectedUnit.toLowerCase()).toList();
      }

      if (mounted) {
        setState(() {
          _products = loaded;
          _productsTotalCount = res['total'] as int? ?? loaded.length;
          _productsTotalPages = res['totalPages'] as int? ?? 1;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = ApiErrorHandler.getMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadMovements() async {
    setState(() => _movementsLoading = true);
    try {
      final res = await _invRepo.getMovements(
        page: _movementsPage,
        limit: 20,
        adjustmentType: _movementTypeFilter,
      );
      if (mounted) {
        setState(() {
          _movements = res['movements'] as List<StockMovementModel>;
          _movementsTotalPages = res['totalPages'] as int;
          _movementsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _movementsLoading = false);
    }
  }

  Future<void> _loadAlerts() async {
    setState(() => _alertsLoading = true);
    try {
      final res = await _invRepo.getAlerts(
        page: 1,
        limit: 50,
        status: _alertStatusFilter == 'ALL' ? null : _alertStatusFilter,
      );
      if (mounted) {
        setState(() {
          _alerts = res['alerts'] as List<InventoryAlertModel>;
          _alertsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _alertsLoading = false);
    }
  }

  void _openStockAdjustmentDialog(ProductModel product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _StockAdjustmentBottomSheet(
        product: product,
        onSuccess: () async {
          Navigator.of(ctx).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Stock for "${product.name}" successfully updated!'),
              backgroundColor: AppColors.primary,
            ),
          );
          final updatedSummary = await _invRepo.getSummary();
          setState(() => _summary = updatedSummary);
          _loadProducts();
          if (_tabController.index == 1) _loadMovements();
          if (_tabController.index == 2) _loadAlerts();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8F2), // Warm Ivory
      appBar: AppBar(
        title: const Text(
          'Inventory & Stock Control',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        backgroundColor: AppColors.primary, // Deep Forest Green
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh inventory',
            onPressed: () {
              _initialLoad();
              if (_tabController.index == 1) _loadMovements();
              if (_tabController.index == 2) _loadAlerts();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent, // Warm Amber
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: [
            const Tab(icon: Icon(Icons.inventory, size: 18), text: 'Catalog Stock'),
            const Tab(icon: Icon(Icons.history, size: 18), text: 'Audit Trail'),
            Tab(
              icon: Badge(
                isLabelVisible: (_summary?.activeAlertsCount ?? 0) > 0,
                label: Text('${_summary?.activeAlertsCount ?? 0}'),
                child: const Icon(Icons.notifications_active_outlined, size: 18),
              ),
              text: 'Stock Alerts',
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCatalogStockTab(),
          _buildAuditTrailTab(),
          _buildStockAlertsTab(),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 1: CATALOG STOCK & KPIS
  // -------------------------------------------------------------
  Widget _buildCatalogStockTab() {
    if (_isLoading && _summary == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null && _summary == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _initialLoad,
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _initialLoad,
      child: ListView(
        padding: const EdgeInsets.all(AppDimensions.md),
        children: [
          // KPI Metric Cards
          _buildKpiMetricsGrid(),
          const SizedBox(height: AppDimensions.md),

          // Search and Filters Bar
          _buildFilterBar(),
          const SizedBox(height: AppDimensions.sm),

          // Total Items Count & Sorting
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$_productsTotalCount Items Recorded',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              DropdownButton<String>(
                value: _selectedSort,
                underline: const SizedBox(),
                icon: const Icon(Icons.sort, size: 16),
                style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                items: const [
                  DropdownMenuItem(value: 'stock_asc', child: Text('Stock: Low to High')),
                  DropdownMenuItem(value: 'stock_desc', child: Text('Stock: High to Low')),
                  DropdownMenuItem(value: 'name_asc', child: Text('Name (A-Z)')),
                  DropdownMenuItem(value: 'newest', child: Text('Recently Added')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedSort = val);
                    _loadProducts();
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: AppDimensions.xs),

          // Products List
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_products.isEmpty)
            _buildEmptyState('No products found matching the selected inventory criteria.')
          else
            ..._products.map((p) => _buildProductInventoryCard(p)),

          // Pagination Controls
          if (_productsTotalPages > 1) _buildPaginationControls(),
          const SizedBox(height: AppDimensions.xxl),
        ],
      ),
    );
  }

  Widget _buildKpiMetricsGrid() {
    if (_summary == null) return const SizedBox();

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: 'Total Catalog',
                value: '${_summary!.totalProducts}',
                subtitle: 'Active SKUs',
                icon: Icons.inventory_2_outlined,
                color: AppColors.primary,
                bgColor: AppColors.primaryContainer,
              ),
            ),
            const SizedBox(width: AppDimensions.sm),
            Expanded(
              child: _buildKpiCard(
                title: 'Healthy Stock',
                value: '${_summary!.inStockCount}',
                subtitle: 'Above threshold',
                icon: Icons.check_circle_outline,
                color: const Color(0xFF166534),
                bgColor: const Color(0xFFDCFCE7),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppDimensions.sm),
        Row(
          children: [
            Expanded(
              child: _buildKpiCard(
                title: 'Low Stock',
                value: '${_summary!.lowStockCount}',
                subtitle: 'Needs reorder',
                icon: Icons.warning_amber_rounded,
                color: const Color(0xFFB45309),
                bgColor: const Color(0xFFFEF3C7),
                onTap: () {
                  setState(() => _selectedStatus = 'low_stock');
                  _loadProducts();
                },
              ),
            ),
            const SizedBox(width: AppDimensions.sm),
            Expanded(
              child: _buildKpiCard(
                title: 'Out of Stock',
                value: '${_summary!.outOfStockCount}',
                subtitle: 'Depleted stock',
                icon: Icons.highlight_off_rounded,
                color: const Color(0xFF991B1B),
                bgColor: const Color(0xFFFEE2E2),
                onTap: () {
                  setState(() => _selectedStatus = 'out_of_stock');
                  _loadProducts();
                },
              ),
            ),
          ],
        ),
        if (_summary!.expiringSoonCount > 0) ...[
          const SizedBox(height: AppDimensions.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              children: [
                const Icon(Icons.timer_outlined, color: Color(0xFFD97706), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${_summary!.expiringSoonCount} item(s) approaching expiry within 30 days.',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
      child: Container(
        padding: const EdgeInsets.all(AppDimensions.sm + 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    value,
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Column(
      children: [
        // Search Box
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search by name, SKU, or barcode...',
            hintStyle: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.primary),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      _loadProducts();
                    },
                  )
                : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
          onSubmitted: (_) => _loadProducts(),
        ),
        const SizedBox(height: 8),

        // Filter Chips Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterChip('All Status', 'all', _selectedStatus, (val) {
                setState(() => _selectedStatus = val);
                _loadProducts();
              }),
              const SizedBox(width: 6),
              _buildFilterChip('In Stock', 'in_stock', _selectedStatus, (val) {
                setState(() => _selectedStatus = val);
                _loadProducts();
              }),
              const SizedBox(width: 6),
              _buildFilterChip('Low Stock', 'low_stock', _selectedStatus, (val) {
                setState(() => _selectedStatus = val);
                _loadProducts();
              }),
              const SizedBox(width: 6),
              _buildFilterChip('Out of Stock', 'out_of_stock', _selectedStatus, (val) {
                setState(() => _selectedStatus = val);
                _loadProducts();
              }),
              const SizedBox(width: 12),
              // Category Dropdown
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButton<String?>(
                  value: _selectedCategory,
                  underline: const SizedBox(),
                  hint: const Text('All Categories', style: TextStyle(fontSize: 12)),
                  style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('All Categories'),
                    ),
                    ..._categories.map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Text(c.name),
                        )),
                  ],
                  onChanged: (catId) {
                    setState(() => _selectedCategory = catId);
                    _loadProducts();
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(
    String label,
    String value,
    String groupValue,
    ValueChanged<String> onSelected,
  ) {
    final isSelected = value == groupValue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(value),
      selectedColor: AppColors.primary,
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: isSelected ? Colors.white : AppColors.textPrimary,
      ),
      side: BorderSide(
        color: isSelected ? AppColors.primary : AppColors.border,
      ),
    );
  }

  Widget _buildProductInventoryCard(ProductModel p) {
    Color statusColor;
    String statusText;
    Color statusBg;

    if (p.stockQuantity <= 0) {
      statusColor = const Color(0xFFDC2626);
      statusText = 'OUT OF STOCK';
      statusBg = const Color(0xFFFEE2E2);
    } else if (p.isLowStock) {
      statusColor = const Color(0xFFD97706);
      statusText = 'LOW STOCK';
      statusBg = const Color(0xFFFEF3C7);
    } else {
      statusColor = const Color(0xFF16A34A);
      statusText = 'IN STOCK';
      statusBg = const Color(0xFFDCFCE7);
    }

    return Card(
      margin: const EdgeInsets.only(bottom: AppDimensions.sm),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: const BorderSide(color: AppColors.border),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.sm + 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(AppDimensions.radiusSm),
              child: Container(
                width: 56,
                height: 56,
                color: const Color(0xFFF1F5F9),
                child: p.imageUrl.isNotEmpty
                    ? Image.network(p.imageUrl, fit: BoxFit.cover, errorBuilder: (ctx, err, stack) => const Icon(Icons.image, size: 24, color: Colors.grey))
                    : const Icon(Icons.inventory_2_outlined, color: Colors.grey),
              ),
            ),
            const SizedBox(width: AppDimensions.sm + 4),

            // Product Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          p.name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          statusText,
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'SKU: ${p.sku.isNotEmpty ? p.sku : 'N/A'} • Unit: ${p.unit} • Selling: ${CurrencyFormatter.format(p.sellingPrice)}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 6),

                  // Stock level indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                          children: [
                            const TextSpan(text: 'Current Stock: '),
                            TextSpan(
                              text: '${p.stockQuantity} ${p.unit}',
                              style: TextStyle(fontWeight: FontWeight.w800, color: statusColor),
                            ),
                            TextSpan(
                              text: ' (Min: ${p.lowStockThreshold})',
                              style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),

                      // Quick Adjust Action Button
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: const Size(0, 30),
                        ),
                        icon: const Icon(Icons.tune, size: 14),
                        label: const Text('Adjust', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                        onPressed: () => _openStockAdjustmentDialog(p),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaginationControls() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: _productsPage > 1
                ? () {
                    setState(() => _productsPage--);
                    _loadProducts();
                  }
                : null,
          ),
          Text('Page $_productsPage of $_productsTotalPages', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _productsPage < _productsTotalPages
                ? () {
                    setState(() => _productsPage++);
                    _loadProducts();
                  }
                : null,
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 2: AUDIT TRAIL / STOCK MOVEMENTS
  // -------------------------------------------------------------
  Widget _buildAuditTrailTab() {
    if (_movementsLoading && _movements.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadMovements,
      child: ListView(
        padding: const EdgeInsets.all(AppDimensions.md),
        children: [
          // Filter by movement type
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('All Types', '', _movementTypeFilter ?? '', (_) {
                  setState(() => _movementTypeFilter = null);
                  _loadMovements();
                }),
                const SizedBox(width: 6),
                _buildFilterChip('Supplier Receipt', 'PURCHASE_RECEIPT', _movementTypeFilter ?? '', (_) {
                  setState(() => _movementTypeFilter = 'PURCHASE_RECEIPT');
                  _loadMovements();
                }),
                const SizedBox(width: 6),
                _buildFilterChip('Damaged/Expired', 'DAMAGED_EXPIRED', _movementTypeFilter ?? '', (_) {
                  setState(() => _movementTypeFilter = 'DAMAGED_EXPIRED');
                  _loadMovements();
                }),
                const SizedBox(width: 6),
                _buildFilterChip('Reconciliation', 'RECONCILIATION', _movementTypeFilter ?? '', (_) {
                  setState(() => _movementTypeFilter = 'RECONCILIATION');
                  _loadMovements();
                }),
                const SizedBox(width: 6),
                _buildFilterChip('Opening Stock', 'OPENING_STOCK', _movementTypeFilter ?? '', (_) {
                  setState(() => _movementTypeFilter = 'OPENING_STOCK');
                  _loadMovements();
                }),
              ],
            ),
          ),
          const SizedBox(height: AppDimensions.md),

          if (_movements.isEmpty)
            _buildEmptyState('No stock movements recorded yet.')
          else ...[
            ..._movements.map((m) => _buildMovementItem(m)),
          ],
          if (_movementsTotalPages > 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _movementsPage > 1
                        ? () {
                            setState(() => _movementsPage--);
                            _loadMovements();
                          }
                        : null,
                  ),
                  Text('Page $_movementsPage of $_movementsTotalPages',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _movementsPage < _movementsTotalPages
                        ? () {
                            setState(() => _movementsPage++);
                            _loadMovements();
                          }
                        : null,
                  ),
                ],
              ),
            ),

          const SizedBox(height: AppDimensions.xxl),
        ],
      ),
    );
  }

  Widget _buildMovementItem(StockMovementModel m) {
    final isPositive = m.changeQuantity > 0;
    final deltaColor = isPositive ? const Color(0xFF16A34A) : const Color(0xFFDC2626);
    final deltaPrefix = isPositive ? '+' : '';

    return Card(
      margin: const EdgeInsets.only(bottom: AppDimensions.sm),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: const BorderSide(color: AppColors.border),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    m.productName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: deltaColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$deltaPrefix${m.changeQuantity} ${m.productUnit}',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: deltaColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Text(
                    m.adjustmentType.replaceAll('_', ' '),
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${m.previousQuantity} → ${m.finalQuantity} ${m.productUnit}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Reason: ${m.reason}',
              style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
            ),
            if (m.referenceNumber != null && m.referenceNumber!.isNotEmpty)
              Text(
                'Reference: ${m.referenceNumber}',
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Admin: ${m.performerName ?? m.performerEmail ?? 'System'}',
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                ),
                Text(
                  _formatDate(m.createdAt),
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // TAB 3: STOCK ALERTS
  // -------------------------------------------------------------
  Widget _buildStockAlertsTab() {
    if (_alertsLoading && _alerts.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _loadAlerts,
      child: ListView(
        padding: const EdgeInsets.all(AppDimensions.md),
        children: [
          Row(
            children: [
              _buildFilterChip('Active Alerts', 'ACTIVE', _alertStatusFilter, (val) {
                setState(() => _alertStatusFilter = val);
                _loadAlerts();
              }),
              const SizedBox(width: 8),
              _buildFilterChip('Acknowledged', 'ACKNOWLEDGED', _alertStatusFilter, (val) {
                setState(() => _alertStatusFilter = val);
                _loadAlerts();
              }),
              const SizedBox(width: 8),
              _buildFilterChip('Resolved', 'RESOLVED', _alertStatusFilter, (val) {
                setState(() => _alertStatusFilter = val);
                _loadAlerts();
              }),
            ],
          ),
          const SizedBox(height: AppDimensions.md),

          if (_alerts.isEmpty)
            _buildEmptyState('No ${_alertStatusFilter.toLowerCase()} alerts found.')
          else
            ..._alerts.map((a) => _buildAlertCard(a)),

          const SizedBox(height: AppDimensions.xxl),
        ],
      ),
    );
  }

  Widget _buildAlertCard(InventoryAlertModel a) {
    Color typeColor = a.alertType == 'OUT_OF_STOCK'
        ? const Color(0xFFDC2626)
        : const Color(0xFFD97706);

    return Card(
      margin: const EdgeInsets.only(bottom: AppDimensions.sm),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: BorderSide(color: a.status == 'ACTIVE' ? typeColor.withValues(alpha: 0.5) : AppColors.border),
      ),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  a.alertType == 'OUT_OF_STOCK' ? Icons.cancel : Icons.warning_amber_rounded,
                  color: typeColor,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    a.productName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: a.status == 'ACTIVE' ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    a.status,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: a.status == 'ACTIVE' ? const Color(0xFF991B1B) : const Color(0xFF166534),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              a.message,
              style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              'Current: ${a.currentQuantity} ${a.productUnit} • Threshold: ${a.threshold} ${a.productUnit}',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Created: ${_formatDate(a.createdAt)}',
                  style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                ),
                if (a.status == 'ACTIVE')
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    ),
                    icon: const Icon(Icons.check_circle_outline, size: 14),
                    label: const Text('Acknowledge', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                    onPressed: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      try {
                        await _invRepo.acknowledgeAlert(a.id);
                        messenger.showSnackBar(
                          const SnackBar(content: Text('Alert marked as acknowledged.')),
                        );
                        if (mounted) _loadAlerts();
                      } catch (e) {
                        messenger.showSnackBar(
                          SnackBar(content: Text('Failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
                        );
                      }
                    },
                  )
                else if (a.acknowledgedByName != null)
                  Text(
                    'Ack by: ${a.acknowledgedByName}',
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

// -------------------------------------------------------------
// STOCK ADJUSTMENT MODAL BOTTOM SHEET
// -------------------------------------------------------------
class _StockAdjustmentBottomSheet extends StatefulWidget {
  final ProductModel product;
  final VoidCallback onSuccess;

  const _StockAdjustmentBottomSheet({
    required this.product,
    required this.onSuccess,
  });

  @override
  State<_StockAdjustmentBottomSheet> createState() => _StockAdjustmentBottomSheetState();
}

class _StockAdjustmentBottomSheetState extends State<_StockAdjustmentBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final AdminInventoryRepository _repo = adminInventoryRepository;

  String _adjustmentType = 'PURCHASE_RECEIPT';
  final TextEditingController _qtyController = TextEditingController();
  final TextEditingController _reasonController = TextEditingController();
  final TextEditingController _invoiceController = TextEditingController();
  final TextEditingController _batchController = TextEditingController();
  DateTime? _expiryDate;

  bool _isSubmitting = false;
  String? _error;

  final Map<String, String> _typeLabels = {
    'PURCHASE_RECEIPT': 'Stock Received from Supplier',
    'OPENING_STOCK': 'Opening Stock Initial Count',
    'MANUAL_INCREASE': 'Manual Stock Increase',
    'MANUAL_DECREASE': 'Manual Stock Decrease',
    'DAMAGED_EXPIRED': 'Damaged or Expired Goods Write-Off',
    'CUSTOMER_RETURN': 'Customer Returned Goods',
    'RECONCILIATION': 'Physical Inventory Count Reconciliation',
  };

  @override
  void dispose() {
    _qtyController.dispose();
    _reasonController.dispose();
    _invoiceController.dispose();
    _batchController.dispose();
    super.dispose();
  }

  double get _currentStock => widget.product.stockQuantity.toDouble();

  double? get _parsedInputQty => double.tryParse(_qtyController.text.trim());

  double get _computedFinalQuantity {
    final qty = _parsedInputQty ?? 0;
    if (_adjustmentType == 'RECONCILIATION') return qty;
    if (_adjustmentType == 'OPENING_STOCK') return _currentStock == 0 ? qty : qty;
    if (['PURCHASE_RECEIPT', 'MANUAL_INCREASE', 'CUSTOMER_RETURN'].contains(_adjustmentType)) {
      return _currentStock + qty;
    }
    return _currentStock - qty;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final computedFinal = _computedFinalQuantity;
    if (computedFinal < 0) {
      setState(() => _error = 'Stock cannot become negative ($_computedFinalQuantity).');
      return;
    }

    // Confirmation dialog for destructive adjustments
    if (['MANUAL_DECREASE', 'DAMAGED_EXPIRED'].contains(_adjustmentType) || computedFinal == 0) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Confirm Stock Reduction'),
          content: Text(
            'Are you sure you want to reduce stock for "${widget.product.name}" from $_currentStock to $computedFinal ${widget.product.unit}?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final qty = _parsedInputQty!;
      if (_adjustmentType == 'RECONCILIATION') {
        await _repo.reconcileStock({
          'productId': widget.product.id,
          'physicalCount': qty,
          'reason': _reasonController.text.trim().isEmpty ? 'Reconciliation count' : _reasonController.text.trim(),
          'notes': _invoiceController.text.trim().isEmpty ? null : _invoiceController.text.trim(),
        });
      } else {
        await _repo.adjustStock({
          'productId': widget.product.id,
          'adjustmentType': _adjustmentType,
          'quantity': qty,
          'reason': _reasonController.text.trim(),
          'supplierInvoiceNumber': _invoiceController.text.trim().isEmpty ? null : _invoiceController.text.trim(),
          'batchNumber': _batchController.text.trim().isEmpty ? null : _batchController.text.trim(),
          'expiryDate': _expiryDate?.toIso8601String(),
        });
      }

      widget.onSuccess();
    } catch (e) {
      setState(() {
        _error = ApiErrorHandler.getMessage(e);
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: AppDimensions.lg,
        right: AppDimensions.lg,
        top: AppDimensions.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppDimensions.lg,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Stock Adjustment',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.primary),
                        ),
                        Text(
                          widget.product.name,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(),
              const SizedBox(height: 8),

              // Current Stock Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Current Quantity: $_currentStock ${widget.product.unit}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                    Text('Threshold: ${widget.product.lowStockThreshold}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Adjustment Type Dropdown
              const Text('Adjustment Operation', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
              const SizedBox(height: 4),
              DropdownButtonFormField<String>(
                initialValue: _adjustmentType,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                items: _typeLabels.entries
                    .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value, style: const TextStyle(fontSize: 12))))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _adjustmentType = val);
                },
              ),
              const SizedBox(height: 12),

              // Quantity Input
              Text(
                _adjustmentType == 'RECONCILIATION'
                    ? 'Actual Physical Count (${widget.product.unit})'
                    : 'Quantity Added / Removed (${widget.product.unit})',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
              ),
              const SizedBox(height: 4),
              TextFormField(
                controller: _qtyController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  hintText: 'Enter quantity',
                  suffixText: widget.product.unit,
                  border: const OutlineInputBorder(),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please enter quantity';
                  final n = double.tryParse(val.trim());
                  if (n == null || n < 0) return 'Invalid non-negative number';
                  if (_adjustmentType != 'RECONCILIATION' && n == 0) return 'Quantity must be greater than 0';
                  return null;
                },
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 4),

              // Preview Final Quantity
              if (_parsedInputQty != null)
                Text(
                  'Final stock will become: $_computedFinalQuantity ${widget.product.unit}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: _computedFinalQuantity < 0 ? AppColors.error : AppColors.primary,
                  ),
                ),
              const SizedBox(height: 12),

              // Reason Input
              const Text('Audit Reason / Notes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
              const SizedBox(height: 4),
              TextFormField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  hintText: 'e.g. Received weekly supply invoice, Torn bag in store, etc.',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                validator: (val) {
                  if (val == null || val.trim().length < 2) return 'Please enter a valid reason (min 2 chars)';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Optional Supplier / Invoice Reference
              if (['PURCHASE_RECEIPT', 'CUSTOMER_RETURN'].contains(_adjustmentType)) ...[
                const Text('Supplier Invoice / Ref Number (Optional)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                TextFormField(
                  controller: _invoiceController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. INV-2026-0091',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),

                // Batch Number
                const Text('Batch Number (Optional)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 4),
                TextFormField(
                  controller: _batchController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. BATCH-A12',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),

                // Expiry Date Picker
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _expiryDate == null
                            ? 'No expiry date set'
                            : 'Expiry: ${_expiryDate!.day}/${_expiryDate!.month}/${_expiryDate!.year}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 14),
                      label: const Text('Pick Expiry'),
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now().add(const Duration(days: 90)),
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 1800)),
                        );
                        if (picked != null) setState(() => _expiryDate = picked);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],

              // Error display
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 12)),
                ),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: _isSubmitting ? null : _submit,
                      child: _isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Record Stock Movement', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
