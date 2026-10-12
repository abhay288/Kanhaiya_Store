import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../../data/admin_orders_repository.dart';
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
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

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
        setState(() {
          _metrics = metricsData;
          _orders = ordersData['orders'] as List<CustomerOrderModel>;
          _totalOrders = ordersData['total'] as int;
          _totalPages = (ordersData['totalPages'] as int).clamp(1, 9999);
          _currentPage = ordersData['page'] as int;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('Order Operations & Tracking'),
        backgroundColor: AppColors.onPrimaryContainer,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Orders',
            onPressed: _loadData,
          ),
        ],
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
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        onPressed: () => showOrderInvoiceDialog(context, order),
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
