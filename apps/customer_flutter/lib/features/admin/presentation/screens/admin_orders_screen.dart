import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../../data/admin_orders_repository.dart';
import '../../data/admin_catalog_repository.dart';
import '../../../catalog/domain/models/product_model.dart';
import 'admin_order_details_screen.dart';
import '../../../orders/presentation/widgets/invoice_dialog.dart';

class AdminOrdersScreen extends ConsumerStatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  ConsumerState<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends ConsumerState<AdminOrdersScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Timer? _realtimeTimer;

  // Metrics
  Map<String, int> _metrics = {};

  // Orders list & pagination
  List<CustomerOrderModel> _orders = [];
  int _currentPage = 1;
  int _totalPages = 1;
  int _totalOrders = 0;

  // Filters & Search
  final TextEditingController _searchController = TextEditingController();
  String _selectedStatus = 'ALL';
  String _selectedPaymentStatus = 'ALL';
  String _selectedFulfillment = 'ALL';
  final String _sortBy = 'createdAt';
  final String _sortOrder = 'desc';

  final List<String> _statuses = [
    'ALL',
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
  ];

  @override
  void initState() {
    super.initState();
    _loadData(silent: false);

    // Real-time synchronization: poll admin orders and metrics every 8 seconds
    _realtimeTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted) {
        _loadData(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _realtimeTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final metricsFuture = repo.getMetrics();
      final ordersFuture = repo.getOrders(
        page: _currentPage,
        limit: 15,
        status: _selectedStatus == 'ALL' ? null : _selectedStatus,
        paymentStatus: _selectedPaymentStatus == 'ALL' ? null : _selectedPaymentStatus,
        fulfillmentMethod: _selectedFulfillment == 'ALL' ? null : _selectedFulfillment,
        search: _searchController.text.trim(),
        sortBy: _sortBy,
        sortOrder: _sortOrder,
      );

      final metricsData = await metricsFuture;
      final ordersData = await ordersFuture;

      if (mounted) {
        final incomingOrders = List<CustomerOrderModel>.from(ordersData['orders'] as List<CustomerOrderModel>);
        
        // Priority sort: active orders (PLACED, CONFIRMED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY) first,
        // completed and cancelled orders go down to the bottom
        if (_selectedStatus == 'ALL') {
          incomingOrders.sort((a, b) {
            final aFinished = (a.orderStatus == 'COMPLETED' || a.orderStatus == 'CANCELLED') ? 1 : 0;
            final bFinished = (b.orderStatus == 'COMPLETED' || b.orderStatus == 'CANCELLED') ? 1 : 0;
            if (aFinished != bFinished) {
              return aFinished.compareTo(bFinished);
            }
            return b.createdAt.compareTo(a.createdAt);
          });
        }

        final mergedMetrics = Map<String, int>.from(metricsData);
        // Fallback: If metrics endpoint returned 0 or missing totalOrders, but we have orders:
        if ((mergedMetrics['totalOrders'] == null || mergedMetrics['totalOrders'] == 0) && incomingOrders.isNotEmpty) {
          mergedMetrics['totalOrders'] = ordersData['total'] as int? ?? incomingOrders.length;
          mergedMetrics['placedOrders'] = incomingOrders.where((o) => o.orderStatus == 'PLACED').length;
          mergedMetrics['confirmedOrders'] = incomingOrders.where((o) => o.orderStatus == 'CONFIRMED').length;
          mergedMetrics['preparingOrders'] = incomingOrders.where((o) => o.orderStatus == 'PREPARING' || o.orderStatus == 'PACKED').length;
          mergedMetrics['readyForPickupOrders'] = incomingOrders.where((o) => o.orderStatus == 'READY_FOR_PICKUP').length;
          mergedMetrics['outForDeliveryOrders'] = incomingOrders.where((o) => o.orderStatus == 'OUT_FOR_DELIVERY').length;
          mergedMetrics['completedOrders'] = incomingOrders.where((o) => o.orderStatus == 'COMPLETED').length;
          mergedMetrics['cancelledOrders'] = incomingOrders.where((o) => o.orderStatus == 'CANCELLED').length;
          mergedMetrics['awaitingPaymentOrders'] = incomingOrders.where((o) => o.paymentMethod == 'WHATSAPP_QR' && o.paymentStatus != 'PAID').length;
        }

        final newTotal = ordersData['total'] as int;
        final newPages = (ordersData['totalPages'] as int).clamp(1, 9999);
        final newPage = ordersData['page'] as int;

        // In silent mode, only call setState if data actually changed to prevent flickering
        if (silent && _orders.length == incomingOrders.length) {
          bool identical = true;
          for (int i = 0; i < _orders.length; i++) {
            if (_orders[i].id != incomingOrders[i].id ||
                _orders[i].orderStatus != incomingOrders[i].orderStatus ||
                _orders[i].paymentStatus != incomingOrders[i].paymentStatus) {
              identical = false;
              break;
            }
          }
          if (identical &&
              _totalOrders == newTotal &&
              _currentPage == newPage &&
              _metrics['totalOrders'] == mergedMetrics['totalOrders']) {
            return;
          }
        }

        setState(() {
          _metrics = mergedMetrics;
          _orders = incomingOrders;
          _totalOrders = newTotal;
          _totalPages = newPages;
          _currentPage = newPage;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _errorMessage = ApiErrorHandler.getMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PLACED':
        return Colors.orange.shade700;
      case 'CONFIRMED':
        return Colors.blue.shade700;
      case 'PREPARING':
        return Colors.purple.shade700;
      case 'READY_FOR_PICKUP':
        return Colors.indigo.shade700;
      case 'OUT_FOR_DELIVERY':
        return Colors.teal.shade700;
      case 'COMPLETED':
        return AppColors.primary;
      case 'CANCELLED':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  Future<void> _deleteOrder(CustomerOrderModel order) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Order #${order.orderNumber}?'),
        content: const Text(
          'Are you sure you want to permanently delete this order directly from MongoDB? Any reserved inventory will be automatically restored to the product stock.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete from Mongo', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      await repo.deleteAdminOrder(order.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order #${order.orderNumber} deleted and stock restored.')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete order: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _openCreateOrderDialog() async {
    final nameCtrl = TextEditingController(text: 'In-Store Walk-in');
    final phoneCtrl = TextEditingController(text: '9999999999');
    final emailCtrl = TextEditingController();
    final notesCtrl = TextEditingController(text: 'Admin Counter Order');
    String fulfillmentMethod = 'STORE_PICKUP';
    String paymentMethod = 'COD';
    String paymentStatus = 'PAID';
    String orderStatus = 'COMPLETED';

    List<ProductModel> catalogProducts = [];
    bool loadingProducts = true;
    String? selectedProductId;
    int selectedQuantity = 1;

    try {
      final res = await adminCatalogRepository.getProducts(limit: 60);
      catalogProducts = res['items'] as List<ProductModel>;
      if (catalogProducts.isNotEmpty) {
        selectedProductId = catalogProducts.first.id;
      }
      loadingProducts = false;
    } catch (_) {
      loadingProducts = false;
    }

    if (!mounted) return;

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) {
          final selectedProd = catalogProducts.where((p) => p.id == selectedProductId).firstOrNull;
          final totalEst = (selectedProd?.sellingPrice ?? 0) * selectedQuantity;

          return AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.add_shopping_cart, color: AppColors.primary),
                SizedBox(width: 8),
                Text('Create Manual Order', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ],
            ),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Customer Full Name', border: OutlineInputBorder(), isDense: true),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: phoneCtrl,
                      decoration: const InputDecoration(labelText: 'Customer Phone (10 digits)', border: OutlineInputBorder(), isDense: true),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email Address (Optional)', border: OutlineInputBorder(), isDense: true),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),
                    const Text('Select Product', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    const SizedBox(height: 4),
                    if (loadingProducts)
                      const LinearProgressIndicator()
                    else if (catalogProducts.isEmpty)
                      const Text('No products available in catalog', style: TextStyle(color: Colors.red, fontSize: 12))
                    else
                      DropdownButtonFormField<String>(
                        isExpanded: true,
                        decoration: const InputDecoration(border: OutlineInputBorder(), isDense: true),
                        initialValue: selectedProductId,
                        items: catalogProducts.map((p) {
                          return DropdownMenuItem<String>(
                            value: p.id,
                            child: Text(
                              '${p.name} (${CurrencyFormatter.format(p.sellingPrice)}) - Stock: ${p.stockQuantity}',
                              style: const TextStyle(fontSize: 12),
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setDlgState(() => selectedProductId = val);
                        },
                      ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Text('Quantity: ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline, size: 20),
                          onPressed: selectedQuantity > 1 ? () => setDlgState(() => selectedQuantity--) : null,
                        ),
                        Text('$selectedQuantity', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline, size: 20),
                          onPressed: () => setDlgState(() => selectedQuantity++),
                        ),
                        const Spacer(),
                        Text(
                          'Total: ${CurrencyFormatter.format(totalEst)}',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            decoration: const InputDecoration(labelText: 'Payment Status', border: OutlineInputBorder(), isDense: true),
                            initialValue: paymentStatus,
                            items: const [
                              DropdownMenuItem(value: 'PAID', child: Text('PAID (Cash/UPI)')),
                              DropdownMenuItem(value: 'PENDING', child: Text('PENDING')),
                            ],
                            onChanged: (val) {
                              if (val != null) setDlgState(() => paymentStatus = val);
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            decoration: const InputDecoration(labelText: 'Order Status', border: OutlineInputBorder(), isDense: true),
                            initialValue: orderStatus,
                            items: const [
                              DropdownMenuItem(value: 'COMPLETED', child: Text('COMPLETED')),
                              DropdownMenuItem(value: 'CONFIRMED', child: Text('CONFIRMED')),
                              DropdownMenuItem(value: 'PREPARING', child: Text('PREPARING')),
                            ],
                            onChanged: (val) {
                              if (val != null) setDlgState(() => orderStatus = val);
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: notesCtrl,
                      decoration: const InputDecoration(labelText: 'Order Notes', border: OutlineInputBorder(), isDense: true),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: selectedProductId == null
                    ? null
                    : () async {
                        try {
                          final repo = ref.read(adminOrdersRepositoryProvider);
                          await repo.createAdminOrder({
                            'customerName': nameCtrl.text.trim(),
                            'customerPhone': phoneCtrl.text.trim(),
                            'customerEmail': emailCtrl.text.trim(),
                            'customerNotes': notesCtrl.text.trim(),
                            'fulfillmentMethod': fulfillmentMethod,
                            'paymentMethod': paymentMethod,
                            'paymentStatus': paymentStatus,
                            'orderStatus': orderStatus,
                            'items': [
                              {
                                'productId': selectedProductId,
                                'quantity': selectedQuantity,
                              }
                            ],
                          });
                          if (ctx.mounted) Navigator.pop(ctx, true);
                        } catch (e) {
                          if (ctx.mounted) {
                            ScaffoldMessenger.of(ctx).showSnackBar(
                              SnackBar(content: Text('Failed: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
                            );
                          }
                        }
                      },
                child: const Text('Place Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              ),
            ],
          );
        },
      ),
    );

    if (created == true) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order created successfully in MongoDB!'), backgroundColor: AppColors.primary),
        );
        _loadData();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text(
          'Order Operations & Tracking',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_shopping_cart),
            tooltip: 'Create New Order',
            onPressed: _openCreateOrderDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Orders',
            onPressed: _loadData,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_shopping_cart),
        label: const Text('New Order', style: TextStyle(fontWeight: FontWeight.w700)),
        onPressed: _openCreateOrderDialog,
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: CustomScrollView(
          slivers: [
            // KPI Summary Counters
            SliverToBoxAdapter(
              child: _buildMetricsHeader(),
            ),

            // Search & Filter Bar
            SliverToBoxAdapter(
              child: _buildFilterSection(),
            ),

            // Order List State Handling
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(AppDimensions.lg),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else if (_orders.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inbox_outlined, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      const Text(
                        'No matching orders found',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Try clearing search queries or adjusting filters.',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final order = _orders[index];
                      return _buildOrderCard(order);
                    },
                    childCount: _orders.length,
                  ),
                ),
              ),

            // Pagination Controls
            if (!_isLoading && _orders.isNotEmpty)
              SliverToBoxAdapter(
                child: _buildPaginationBar(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricsHeader() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md),
        child: Row(
          children: [
            _buildMetricChip('Total Orders', _metrics['totalOrders'] ?? 0, Colors.blueGrey, 'ALL'),
            _buildMetricChip('Awaiting WhatsApp QR', _metrics['awaitingPaymentOrders'] ?? 0, Colors.amber.shade800, null, isPaymentPending: true),
            _buildMetricChip('New / Placed', _metrics['placedOrders'] ?? 0, Colors.orange.shade700, 'PLACED'),
            _buildMetricChip('Confirmed', _metrics['confirmedOrders'] ?? 0, Colors.blue.shade700, 'CONFIRMED'),
            _buildMetricChip('Preparing', _metrics['preparingOrders'] ?? 0, Colors.purple.shade700, 'PREPARING'),
            _buildMetricChip('Ready Pickup', _metrics['readyForPickupOrders'] ?? 0, Colors.indigo.shade700, 'READY_FOR_PICKUP'),
            _buildMetricChip('Out Delivery', _metrics['outForDeliveryOrders'] ?? 0, Colors.teal.shade700, 'OUT_FOR_DELIVERY'),
            _buildMetricChip('Completed', _metrics['completedOrders'] ?? 0, AppColors.primary, 'COMPLETED'),
            _buildMetricChip('Cancelled', _metrics['cancelledOrders'] ?? 0, AppColors.error, 'CANCELLED'),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricChip(String label, int count, Color color, String? filterStatus, {bool isPaymentPending = false}) {
    final isSelected = isPaymentPending
        ? _selectedPaymentStatus == 'PENDING'
        : _selectedStatus == filterStatus;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: () {
          setState(() {
            _currentPage = 1;
            if (isPaymentPending) {
              _selectedPaymentStatus = isSelected ? 'ALL' : 'PENDING';
              _selectedStatus = 'ALL';
            } else if (filterStatus != null) {
              _selectedStatus = filterStatus;
              _selectedPaymentStatus = 'ALL';
            }
          });
          _loadData();
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.15) : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : Colors.grey.shade300,
              width: isSelected ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? color : AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterSection() {
    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(top: 2, bottom: 8),
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Input
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by Order #, Name or Phone...',
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _currentPage = 1;
                        _loadData();
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              isDense: true,
              filled: true,
              fillColor: const Color(0xFFF1F5F9),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
            onSubmitted: (_) {
              _currentPage = 1;
              _loadData();
            },
          ),
          const SizedBox(height: 10),

          // Filters Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Status Filter
                DropdownButton<String>(
                  value: _selectedStatus,
                  isDense: true,
                  underline: const SizedBox(),
                  items: _statuses.map((s) {
                    return DropdownMenuItem(
                      value: s,
                      child: Text(
                        'Status: ${s.replaceAll('_', ' ')}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedStatus = val;
                        _currentPage = 1;
                      });
                      _loadData();
                    }
                  },
                ),
                const SizedBox(width: 14),

                // Fulfillment Filter
                DropdownButton<String>(
                  value: _selectedFulfillment,
                  isDense: true,
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'ALL', child: Text('Method: All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    DropdownMenuItem(value: 'DELIVERY', child: Text('Method: Delivery', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    DropdownMenuItem(value: 'PICKUP', child: Text('Method: Pickup', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedFulfillment = val;
                        _currentPage = 1;
                      });
                      _loadData();
                    }
                  },
                ),
                const SizedBox(width: 14),

                // Payment Status Filter
                DropdownButton<String>(
                  value: _selectedPaymentStatus,
                  isDense: true,
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'ALL', child: Text('Pay: All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    DropdownMenuItem(value: 'PAID', child: Text('Pay: Paid', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    DropdownMenuItem(value: 'PENDING', child: Text('Pay: Pending', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                    DropdownMenuItem(value: 'REFUNDED', child: Text('Pay: Refunded', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedPaymentStatus = val;
                        _currentPage = 1;
                      });
                      _loadData();
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(CustomerOrderModel order) {
    final statusColor = _getStatusColor(order.orderStatus);
    final isPickup = order.fulfillmentMethod.toUpperCase() == 'PICKUP';
    final isPaid = order.paymentStatus.toUpperCase() == 'PAID';

    return Card(
      key: ValueKey(order.id),
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0.5,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => AdminOrderDetailsScreen(orderId: order.id),
            ),
          );
          if (changed == true) {
            _loadData();
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Order Number & Status Pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        order.orderNumber,
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPickup ? Colors.indigo.shade50 : Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: isPickup ? Colors.indigo.shade200 : Colors.teal.shade200,
                          ),
                        ),
                        child: Text(
                          isPickup ? 'PICKUP' : 'DELIVERY',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isPickup ? Colors.indigo.shade800 : Colors.teal.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      order.orderStatus.replaceAll('_', ' '),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Customer details & order time
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${order.customerName} • ${order.customerPhone}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.access_time, size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    _formatDateTime(order.createdAt),
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                  const Spacer(),
                  Text(
                    '${order.items.length} ${order.items.length == 1 ? "item" : "items"}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
              const Divider(height: 16),

              // Bottom Row: Payment Info and Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPaid ? Colors.green.shade50 : Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: isPaid ? Colors.green.shade200 : Colors.amber.shade200),
                        ),
                        child: Text(
                          '${order.paymentMethod} • ${order.paymentStatus}',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isPaid ? Colors.green.shade800 : Colors.amber.shade900,
                          ),
                        ),
                      ),
                      if (order.paymentMethod == 'WHATSAPP_QR' && !isPaid)
                        Padding(
                          padding: const EdgeInsets.only(left: 6),
                          child: Icon(Icons.pending_actions, size: 16, color: Colors.amber.shade800),
                        ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.receipt_long, size: 18, color: AppColors.primary),
                        tooltip: 'View Invoice',
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                        onPressed: () => showOrderInvoiceDialog(context, order),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                        tooltip: 'Delete Order from MongoDB',
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                        onPressed: () => _deleteOrder(order),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        CurrencyFormatter.format(order.totalAmount),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaginationBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.md, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Showing ${(_currentPage - 1) * 15 + 1}-${((_currentPage) * 15).clamp(0, _totalOrders)} of $_totalOrders',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: _currentPage > 1
                    ? () {
                        setState(() => _currentPage--);
                        _loadData();
                      }
                    : null,
              ),
              Text(
                '$_currentPage / $_totalPages',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: _currentPage < _totalPages
                    ? () {
                        setState(() => _currentPage++);
                        _loadData();
                      }
                    : null,
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    final local = dt.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][local.month - 1];
    final year = local.year;
    final hour = local.hour > 12 ? local.hour - 12 : (local.hour == 0 ? 12 : local.hour);
    final min = local.minute.toString().padLeft(2, '0');
    final ampm = local.hour >= 12 ? 'PM' : 'AM';
    return '$day $month $year, $hour:$min $ampm';
  }
}
