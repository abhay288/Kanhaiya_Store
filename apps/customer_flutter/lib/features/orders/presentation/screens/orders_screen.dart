import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../checkout/data/repositories/checkout_repository.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../widgets/invoice_dialog.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  final String? initialOrderNumber;

  const OrdersScreen({super.key, this.initialOrderNumber});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<CustomerOrderModel> _orders = [];
  Timer? _refreshTimer;
  String? _selectedMonth; // null or 'All' = all months
  bool _hasOpenedInitialOrder = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchOrders(silent: false);
    });

    // Real-time synchronization: Poll orders every 8 seconds in background
    _refreshTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted) {
        _fetchOrders(silent: true);
      }
    });
  }

  @override
  void didUpdateWidget(covariant OrdersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialOrderNumber != null &&
        widget.initialOrderNumber != oldWidget.initialOrderNumber) {
      _hasOpenedInitialOrder = false;
      _checkAndOpenInitialOrder();
    }
  }

  void _checkAndOpenInitialOrder() {
    if (widget.initialOrderNumber == null || _hasOpenedInitialOrder) return;
    final matches = _orders.where(
      (o) => o.orderNumber == widget.initialOrderNumber || o.id == widget.initialOrderNumber,
    );
    if (matches.isNotEmpty) {
      _hasOpenedInitialOrder = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _showOrderTrackingModal(matches.first);
        }
      });
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  String _formatMonthYear(DateTime dt) {
    final local = dt.toLocal();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[local.month - 1]} ${local.year}';
  }

  List<String> get _availableMonths {
    final monthSet = <String>{};
    for (final o in _orders) {
      monthSet.add(_formatMonthYear(o.createdAt));
    }
    return monthSet.toList();
  }

  List<CustomerOrderModel> get _filteredOrders {
    if (_selectedMonth == null || _selectedMonth == 'All') {
      return _orders;
    }
    return _orders.where((o) => _formatMonthYear(o.createdAt) == _selectedMonth).toList();
  }

  Future<void> _fetchOrders({bool silent = false}) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) {
      if (mounted && !silent) {
        setState(() {
          _isLoading = false;
          _errorMessage = null;
          _orders = [];
        });
      }
      return;
    }

    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final repo = ref.read(checkoutRepositoryProvider);
      final list = await repo.getMyOrders();

      // Filter out locally deleted order invoices
      final prefs = await SharedPreferences.getInstance();
      final deleted = prefs.getStringList('kgs_deleted_order_numbers') ?? [];
      final activeList = list.where((o) => !deleted.contains(o.orderNumber)).toList();

      if (mounted) {
        setState(() {
          _orders = activeList;
          _isLoading = false;
          _errorMessage = null;
        });
        _checkAndOpenInitialOrder();
      }
    } catch (e) {
      if (mounted && !silent) {
        final raw = e.toString().replaceAll('Exception: ', '').toLowerCase();
        String userMsg = 'Unable to load orders. Please check your internet connection.';
        if (raw.contains('unauthorized') || raw.contains('authentication required')) {
          userMsg = 'Please sign in to view your order history.';
        } else if (raw.contains('not found')) {
          userMsg = 'No orders found for this account.';
        }
        setState(() {
          _errorMessage = userMsg;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _confirmDeleteOrder(CustomerOrderModel order) async {
    final invNum = order.invoiceNumber ?? 'INV-${order.orderNumber.replaceAll('KGS-', '')}';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: AppColors.error),
            SizedBox(width: 8),
            Text('Delete Invoice?'),
          ],
        ),
        content: Text(
          'Are you sure you want to permanently delete Paper Tax Invoice #$invNum (${order.orderNumber})?\n\nThis will remove this order invoice from your account.',
          style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.delete_outline, size: 18),
            label: const Text('Delete Invoice'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final messenger = ScaffoldMessenger.of(context);

      // 1. Optimistic instant removal from UI
      setState(() {
        _orders.removeWhere((o) => o.orderNumber == order.orderNumber || o.id == order.id);
      });

      // 2. Persist to local deleted storage
      try {
        final prefs = await SharedPreferences.getInstance();
        final deleted = prefs.getStringList('kgs_deleted_order_numbers') ?? [];
        if (!deleted.contains(order.orderNumber)) {
          deleted.add(order.orderNumber);
          await prefs.setStringList('kgs_deleted_order_numbers', deleted);
        }
      } catch (_) {}

      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text('✅ Invoice #$invNum deleted successfully.'),
            backgroundColor: AppColors.primary,
            duration: const Duration(seconds: 3),
          ),
        );
      }

      // 3. Inform backend
      try {
        final repo = ref.read(checkoutRepositoryProvider);
        await repo.deleteOrder(order.orderNumber);
      } catch (_) {}
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

  void _showOrderTrackingModal(CustomerOrderModel order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Modal Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order.orderNumber}',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
                        ),
                        Text(
                          _formatDateTime(order.createdAt),
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),

              // Scrollable Details
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Tracking Status Banner
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _getStatusColor(order.orderStatus).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _getStatusColor(order.orderStatus).withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.local_shipping_outlined, color: _getStatusColor(order.orderStatus), size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.orderStatus.replaceAll('_', ' '),
                                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: _getStatusColor(order.orderStatus)),
                                  ),
                                  Text(
                                    'In-Store Pickup at Kanhaiya General Store counter',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Timeline Stepper
                      const Text('Fulfillment Timeline', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      const SizedBox(height: 10),
                      _buildTimeline(order),
                      const Divider(height: 24),

                      // Purchased Items
                      Text(
                        'Items in this Order (${order.items.length})',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                      ...order.items.map((it) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    '${it.name} (${it.packSize ?? it.unit}) x ${it.quantity}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                                  ),
                                ),
                                Text(
                                  CurrencyFormatter.format(it.lineSubtotal),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          )),
                      const Divider(height: 20),

                      // Financial Breakdown
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          Text(CurrencyFormatter.format(order.subtotal), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Pickup Charge', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          const Text('FREE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                        ],
                      ),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                          Text(CurrencyFormatter.format(order.totalAmount), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppColors.primary)),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Store Support & Invoice
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Store Support & Help', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                            const SizedBox(height: 4),
                            const Text('Need help with your grocery order? Call our helpline at +91 9936269347', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () async {
                                  final res = await showOrderInvoiceDialog(context, order);
                                  if (res == true) {
                                    if (ctx.mounted) {
                                      Navigator.pop(ctx);
                                    }
                                    if (mounted) {
                                      _fetchOrders(silent: false);
                                    }
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.receipt_long, size: 18),
                                label: const Text('View Full Paper Invoice (Print / PDF)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _confirmDeleteOrder(order);
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.error,
                                  side: const BorderSide(color: Color(0xFFFCA5A5)),
                                  backgroundColor: const Color(0xFFFEF2F2),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                label: const Text('Delete Order Invoice', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.error)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTimeline(CustomerOrderModel order) {
    const steps = ['Placed', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Picked Up'];

    final curStatus = order.orderStatus.toUpperCase();
    int currentStep = 0;
    if (curStatus == 'PLACED') currentStep = 0;
    if (curStatus == 'CONFIRMED') currentStep = 1;
    if (curStatus == 'PREPARING') currentStep = 2;
    if (curStatus == 'READY_FOR_PICKUP') currentStep = 3;
    if (curStatus == 'COMPLETED' || curStatus == 'PICKED_UP') currentStep = 4;
    if (curStatus == 'CANCELLED') currentStep = -1;

    return Column(
      children: List.generate(steps.length, (idx) {
        final isPassed = currentStep >= idx;
        final isCurrent = currentStep == idx;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                CircleAvatar(
                  radius: 10,
                  backgroundColor: curStatus == 'CANCELLED'
                      ? AppColors.error
                      : isPassed
                          ? AppColors.primary
                          : Colors.grey.shade300,
                  child: Icon(
                    curStatus == 'CANCELLED' ? Icons.close : Icons.check,
                    size: 12,
                    color: Colors.white,
                  ),
                ),
                if (idx < steps.length - 1)
                  Container(
                    width: 2,
                    height: 24,
                    color: isPassed && currentStep > idx ? AppColors.primary : Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 2, bottom: 12),
                child: Text(
                  steps[idx],
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                    color: isPassed ? AppColors.textPrimary : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isAuthenticated && !(previous?.isAuthenticated ?? false)) {
        _fetchOrders(silent: false);
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: const Text('My Grocery Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: !authState.isAuthenticated
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppDimensions.lg),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.account_circle_outlined, size: 64, color: AppColors.primary),
                    const SizedBox(height: 16),
                    const Text(
                      'Sign In to View Orders',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Please sign in to see your in-store pickup orders and download invoices.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/signin'),
                      icon: const Icon(Icons.login),
                      label: const Text('Sign In with Google'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : _errorMessage != null
                  ? RefreshIndicator(
                      onRefresh: _fetchOrders,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: Container(
                          height: MediaQuery.of(context).size.height * 0.7,
                          alignment: Alignment.center,
                          padding: const EdgeInsets.all(AppDimensions.lg),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                              const SizedBox(height: 12),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchOrders,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  : _orders.isEmpty
                      ? RefreshIndicator(
                          onRefresh: _fetchOrders,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            child: Container(
                              height: MediaQuery.of(context).size.height * 0.7,
                              alignment: Alignment.center,
                              padding: const EdgeInsets.all(AppDimensions.lg),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.shopping_bag_outlined, size: 56, color: Colors.grey.shade400),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No orders yet',
                                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Your in-store pickup orders will appear here.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                  ),
                                  const SizedBox(height: 20),
                                  ElevatedButton(
                                    onPressed: () => context.go('/home'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                    ),
                                    child: const Text('Browse Store'),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : Column(
                          children: [
                            // Month Filter Bar
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primary),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'Filter by Month:',
                                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.textPrimary),
                                      ),
                                      const Spacer(),
                                      if (_selectedMonth != null && _selectedMonth != 'All')
                                        GestureDetector(
                                          onTap: () => setState(() => _selectedMonth = 'All'),
                                          child: const Text(
                                            'Clear Filter',
                                            style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w700),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: Row(
                                      children: [
                                        _buildMonthChip('All', 'All Invoices (${_orders.length})'),
                                        ..._availableMonths.map((m) {
                                          final count = _orders.where((o) => _formatMonthYear(o.createdAt) == m).length;
                                          return _buildMonthChip(m, '$m ($count)');
                                        }),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Expanded(
                              child: RefreshIndicator(
                                onRefresh: _fetchOrders,
                                child: _filteredOrders.isEmpty
                                    ? SingleChildScrollView(
                                        physics: const AlwaysScrollableScrollPhysics(),
                                        child: Container(
                                          height: MediaQuery.of(context).size.height * 0.5,
                                          alignment: Alignment.center,
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.calendar_today_outlined, size: 48, color: Colors.grey.shade400),
                                              const SizedBox(height: 12),
                                              Text(
                                                'No orders found for $_selectedMonth',
                                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                              ),
                                              const SizedBox(height: 12),
                                              OutlinedButton(
                                                onPressed: () => setState(() => _selectedMonth = 'All'),
                                                child: const Text('Show All Orders'),
                                              ),
                                            ],
                                          ),
                                        ),
                                      )
                                    : ListView.separated(
                                        physics: const AlwaysScrollableScrollPhysics(),
                                        padding: const EdgeInsets.all(AppDimensions.md),
                                        itemCount: _filteredOrders.length,
                                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                                        itemBuilder: (context, index) {
                                          final ord = _filteredOrders[index];
                                          final statusColor = _getStatusColor(ord.orderStatus);

                                      return Card(
                                        elevation: 0.5,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                          side: BorderSide(color: Colors.grey.shade200),
                                        ),
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(10),
                                          onTap: () => _showOrderTrackingModal(ord),
                                          child: Padding(
                                            padding: const EdgeInsets.all(AppDimensions.md),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      ord.orderNumber,
                                                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                                    ),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                      decoration: BoxDecoration(
                                                        color: statusColor.withValues(alpha: 0.12),
                                                        borderRadius: BorderRadius.circular(4),
                                                      ),
                                                      child: Text(
                                                        ord.orderStatus.replaceAll('_', ' '),
                                                        style: TextStyle(
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w800,
                                                          color: statusColor,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  _formatDateTime(ord.createdAt),
                                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                                ),
                                                const Divider(height: 20),
                                                ...ord.items.map(
                                                  (it) => Padding(
                                                    padding: const EdgeInsets.only(bottom: 4),
                                                    child: Text(
                                                      '• ${it.name} (${it.packSize ?? it.unit}) x ${it.quantity}',
                                                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                                                    ),
                                                  ),
                                                ),
                                                const Divider(height: 20),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      '${ord.paymentMethod} • ${ord.paymentStatus}',
                                                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                                    ),
                                                    Text(
                                                      CurrencyFormatter.format(ord.totalAmount),
                                                      style: const TextStyle(
                                                        fontSize: 16,
                                                        fontWeight: FontWeight.w900,
                                                        color: AppColors.primary,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 8),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Wrap(
                                                      spacing: 8,
                                                      runSpacing: 6,
                                                      children: [
                                                        OutlinedButton.icon(
                                                          onPressed: () async {
                                                            final res = await showOrderInvoiceDialog(context, ord);
                                                            if (res == true && mounted) {
                                                              _fetchOrders(silent: false);
                                                            }
                                                          },
                                                          style: OutlinedButton.styleFrom(
                                                            foregroundColor: AppColors.primary,
                                                            side: const BorderSide(color: AppColors.primary),
                                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                            minimumSize: Size.zero,
                                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                          ),
                                                          icon: const Icon(Icons.receipt_long, size: 14),
                                                          label: const Text('Paper Invoice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                        ),
                                                        OutlinedButton.icon(
                                                          onPressed: () => _confirmDeleteOrder(ord),
                                                          style: OutlinedButton.styleFrom(
                                                            foregroundColor: AppColors.error,
                                                            side: const BorderSide(color: Color(0xFFFCA5A5)),
                                                            backgroundColor: const Color(0xFFFEF2F2),
                                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                            minimumSize: Size.zero,
                                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                          ),
                                                          icon: const Icon(Icons.delete_outline, size: 14, color: AppColors.error),
                                                          label: const Text('Delete Invoice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.error)),
                                                        ),
                                                      ],
                                                    ),
                                                    const Row(
                                                      children: [
                                                        Text(
                                                          'Track Order',
                                                          style: TextStyle(
                                                            fontSize: 12,
                                                            fontWeight: FontWeight.w700,
                                                            color: AppColors.primary,
                                                          ),
                                                        ),
                                                        Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                              ),
                            ),
                          ],
                        ),
    );
  }

  Widget _buildMonthChip(String key, String label) {
    final isSelected = (_selectedMonth == null && key == 'All') || _selectedMonth == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: isSelected,
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
        selectedColor: AppColors.primary,
        backgroundColor: Colors.white,
        checkmarkColor: Colors.white,
        showCheckmark: isSelected,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
            width: 1,
          ),
        ),
        onSelected: (selected) {
          setState(() {
            _selectedMonth = key;
          });
        },
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
