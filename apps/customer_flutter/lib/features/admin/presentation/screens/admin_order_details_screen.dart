import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/network/api_error_handler.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../checkout/domain/models/order_model.dart';
import '../../data/admin_orders_repository.dart';
import '../../../orders/presentation/widgets/invoice_dialog.dart';

class AdminOrderDetailsScreen extends ConsumerStatefulWidget {
  final String orderId;

  const AdminOrderDetailsScreen({super.key, required this.orderId});

  @override
  ConsumerState<AdminOrderDetailsScreen> createState() => _AdminOrderDetailsScreenState();
}

class _AdminOrderDetailsScreenState extends ConsumerState<AdminOrderDetailsScreen> {
  bool _isLoading = true;
  bool _isActionInProgress = false;
  String? _errorMessage;
  CustomerOrderModel? _order;
  bool _hasModified = false;

  @override
  void initState() {
    super.initState();
    _fetchOrder();
  }

  Future<void> _fetchOrder() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final order = await repo.getOrderDetails(widget.orderId);
      if (mounted) {
        setState(() {
          _order = order;
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

  List<String> _getAllowedNextStatuses(String currentStatus, String fulfillmentMethod) {
    final cur = currentStatus.toUpperCase();
    final isPickup = fulfillmentMethod.toUpperCase() == 'PICKUP';

    switch (cur) {
      case 'PLACED':
        return ['CONFIRMED', 'CANCELLED'];
      case 'CONFIRMED':
        return ['PREPARING', 'CANCELLED'];
      case 'PREPARING':
        return isPickup ? ['READY_FOR_PICKUP', 'CANCELLED'] : ['OUT_FOR_DELIVERY', 'CANCELLED'];
      case 'READY_FOR_PICKUP':
        return ['COMPLETED', 'CANCELLED'];
      case 'OUT_FOR_DELIVERY':
        return ['COMPLETED', 'CANCELLED'];
      default:
        return [];
    }
  }

  Future<void> _handleStatusTransition(String nextStatus) async {
    if (nextStatus == 'CANCELLED') {
      _showCancelDialog();
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Transition to ${nextStatus.replaceAll('_', ' ')}?'),
        content: Text('Are you sure you want to advance Order #${_order?.orderNumber} to "$nextStatus"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm Transition', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final updated = await repo.updateStatus(widget.orderId, nextStatus);
      _hasModified = true;
      if (mounted) {
        setState(() {
          _order = updated;
          _isActionInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Status updated to ${nextStatus.replaceAll('_', ' ')} successfully.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: ${ApiErrorHandler.getMessage(e)}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _showCancelDialog() async {
    final reasonController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.error),
            SizedBox(width: 8),
            Text('Cancel Order'),
          ],
        ),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Cancelling Order #${_order?.orderNumber} will restore all reserved items back to store inventory.',
                style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: reasonController,
                decoration: const InputDecoration(
                  labelText: 'Cancellation Reason *',
                  hintText: 'e.g., Customer requested, Out of stock...',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Reason is required' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Back')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              if (formKey.currentState?.validate() == true) {
                Navigator.pop(ctx, true);
              }
            },
            child: const Text('Cancel Order & Restore Stock', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final updated = await repo.cancelOrder(widget.orderId, reasonController.text.trim());
      _hasModified = true;
      if (mounted) {
        setState(() {
          _order = updated;
          _isActionInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Order cancelled and inventory restored successfully.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to cancel order: ${ApiErrorHandler.getMessage(e)}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _showVerifyPaymentDialog() async {
    final refController = TextEditingController();
    final notesController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Verify WhatsApp QR Payment'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Total: ${CurrencyFormatter.format(_order?.totalAmount ?? 0)}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primary),
            ),
            const SizedBox(height: 8),
            const Text(
              'Verify that payment has entered the store account before approving.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: refController,
              decoration: const InputDecoration(
                labelText: 'Bank Reference / UTR Number (Optional)',
                hintText: 'e.g. 427192837192',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                labelText: 'Internal Audit Note (Optional)',
                hintText: 'e.g. Verified via HDFC statement',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Mark as PAID', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final updated = await repo.verifyWhatsAppPayment(
        widget.orderId,
        paymentReference: refController.text.trim(),
        notes: notesController.text.trim(),
      );
      _hasModified = true;
      if (mounted) {
        setState(() {
          _order = updated;
          _isActionInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment verified and status set to PAID.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to verify payment: ${ApiErrorHandler.getMessage(e)}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _handleCodCollection() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Record COD Collection?'),
        content: Text('Confirm that ${CurrencyFormatter.format(_order?.totalAmount ?? 0)} has been received in cash.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirm Cash Received', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final updated = await repo.collectCodPayment(widget.orderId, notes: 'Cash collected by staff');
      _hasModified = true;
      if (mounted) {
        setState(() {
          _order = updated;
          _isActionInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('COD Payment recorded as PAID.'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to record COD: ${ApiErrorHandler.getMessage(e)}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _showEditOrderDialog() async {
    if (_order == null) return;
    final nameCtrl = TextEditingController(text: _order!.customerName);
    final phoneCtrl = TextEditingController(text: _order!.customerPhone);
    final emailCtrl = TextEditingController(text: _order!.customerEmail ?? '');
    final notesCtrl = TextEditingController(text: _order!.customerNotes ?? '');
    String selectedStatus = _order!.orderStatus;
    String selectedPaymentStatus = _order!.paymentStatus;

    final statuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
    final paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDlgState) => AlertDialog(
          title: Text('Edit Order #${_order!.orderNumber}'),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Customer Name', border: OutlineInputBorder(), isDense: true),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: phoneCtrl,
                    decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder(), isDense: true),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: emailCtrl,
                    decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder(), isDense: true),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Order Status', border: OutlineInputBorder(), isDense: true),
                    initialValue: statuses.contains(selectedStatus) ? selectedStatus : statuses.first,
                    items: statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                    onChanged: (val) {
                      if (val != null) setDlgState(() => selectedStatus = val);
                    },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Payment Status', border: OutlineInputBorder(), isDense: true),
                    initialValue: paymentStatuses.contains(selectedPaymentStatus) ? selectedPaymentStatus : paymentStatuses.first,
                    items: paymentStatuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                    onChanged: (val) {
                      if (val != null) setDlgState(() => selectedPaymentStatus = val);
                    },
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: notesCtrl,
                    decoration: const InputDecoration(labelText: 'Order Notes', border: OutlineInputBorder(), isDense: true),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Save Changes', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      final updated = await repo.updateAdminOrder(widget.orderId, {
        'customerName': nameCtrl.text.trim(),
        'customerPhone': phoneCtrl.text.trim(),
        'customerEmail': emailCtrl.text.trim(),
        'customerNotes': notesCtrl.text.trim(),
        'orderStatus': selectedStatus,
        'paymentStatus': selectedPaymentStatus,
      });
      _hasModified = true;
      if (mounted) {
        setState(() {
          _order = updated;
          _isActionInProgress = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order updated successfully.'), backgroundColor: AppColors.primary),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update order: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _showDeleteOrderDialog() async {
    if (_order == null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Order #${_order!.orderNumber}?'),
        content: const Text(
          'Are you sure you want to permanently delete this order directly from MongoDB? Any reserved inventory will be automatically restored to the product stock.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Permanently Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isActionInProgress = true);
    try {
      final repo = ref.read(adminOrdersRepositoryProvider);
      await repo.deleteAdminOrder(widget.orderId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order #${_order!.orderNumber} permanently deleted and stock restored.')),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isActionInProgress = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to delete order: ${ApiErrorHandler.getMessage(e)}'), backgroundColor: AppColors.error),
        );
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
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop && _hasModified) {
          // Pass back true to refresh parent list
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FA),
        appBar: AppBar(
          title: Text(
            _order != null ? 'Order #${_order!.orderNumber}' : 'Order Details',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
          ),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 1,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.of(context).pop(_hasModified),
          ),
          actions: [
            if (_order != null) ...[
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                tooltip: 'Edit Order Info',
                onPressed: _showEditOrderDialog,
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Colors.white),
                tooltip: 'Delete Order from MongoDB',
                onPressed: _showDeleteOrderDialog,
              ),
            ],
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _fetchOrder,
            ),
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppDimensions.lg),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                          const SizedBox(height: 12),
                          Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.error)),
                          const SizedBox(height: 16),
                          ElevatedButton(onPressed: _fetchOrder, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : _buildOrderContent(),
      ),
    );
  }

  Widget _buildOrderContent() {
    final order = _order!;
    final isPickup = order.fulfillmentMethod.toUpperCase() == 'PICKUP';
    final isPaid = order.paymentStatus.toUpperCase() == 'PAID';
    final allowedStatuses = _getAllowedNextStatuses(order.orderStatus, order.fulfillmentMethod);
    final statusColor = _getStatusColor(order.orderStatus);

    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.all(AppDimensions.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Banner: Status & Fulfillment
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order.orderNumber,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Placed: ${_formatDateTime(order.createdAt)}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            order.orderStatus.replaceAll('_', ' '),
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: statusColor),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isPickup ? Colors.indigo.shade50 : Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            isPickup ? 'STORE PICKUP' : 'HOME DELIVERY',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: isPickup ? Colors.indigo.shade800 : Colors.teal.shade800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Action Bar for Status Lifecycle
              if (allowedStatuses.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Available Order Actions',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: allowedStatuses.map((st) {
                          final isCancel = st == 'CANCELLED';
                          return ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isCancel ? AppColors.error : AppColors.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            onPressed: _isActionInProgress ? null : () => _handleStatusTransition(st),
                            child: Text(
                              isCancel ? 'Cancel Order' : 'Advance: ${st.replaceAll('_', ' ')}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Customer & Fulfillment Information
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Customer & Fulfillment', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    const Divider(height: 16),
                    _buildInfoRow('Name', order.customerName),
                    _buildInfoRow('Phone', order.customerPhone),
                    if (order.customerEmail != null && order.customerEmail!.isNotEmpty)
                      _buildInfoRow('Email', order.customerEmail!),
                    if (isPickup) ...[
                      const Divider(height: 16),
                      const Text('Store Pickup Point', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      Text(order.pickupDetails?.storeName ?? 'Kanhaiya General Store', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text(order.pickupDetails?.storeAddress ?? 'Main Market, Local Chowk', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    ] else ...[
                      const Divider(height: 16),
                      const Text('Delivery Address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      Text(
                        '${order.deliveryAddress?.houseNumber ?? ""}, ${order.deliveryAddress?.street ?? ""}, ${order.deliveryAddress?.city ?? ""} - ${order.deliveryAddress?.pincode ?? ""}',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      if (order.deliveryAddress?.landmark != null && order.deliveryAddress!.landmark!.isNotEmpty)
                        Text('Landmark: ${order.deliveryAddress!.landmark}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                    if (order.customerNotes != null && order.customerNotes!.isNotEmpty) ...[
                      const Divider(height: 16),
                      Text('Customer Instructions: ${order.customerNotes}', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.indigo)),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Payment Section
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Payment Verification', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isPaid ? Colors.green.shade50 : Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: isPaid ? Colors.green.shade200 : Colors.amber.shade200),
                          ),
                          child: Text(
                            '${order.paymentMethod} • ${order.paymentStatus}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isPaid ? Colors.green.shade800 : Colors.amber.shade900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    if (order.paymentReference != null && order.paymentReference!.isNotEmpty)
                      _buildInfoRow('Payment Ref / UTR', order.paymentReference!),
                    if (!isPaid && order.paymentMethod == 'WHATSAPP_QR') ...[
                      const SizedBox(height: 6),
                      const Text(
                        'This order requires manual verification of the customer\'s WhatsApp QR payment.',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: _isActionInProgress ? null : _showVerifyPaymentDialog,
                          icon: const Icon(Icons.verified, color: Colors.white, size: 18),
                          label: const Text('Verify WhatsApp QR Payment', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                    ] else if (!isPaid && order.paymentMethod == 'COD') ...[
                      const SizedBox(height: 6),
                      const Text(
                        'Cash on Delivery will be collected by staff upon fulfillment.',
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _isActionInProgress ? null : _handleCodCollection,
                          icon: const Icon(Icons.payments_outlined, size: 18),
                          label: const Text('Record Cash Collected'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Itemized Purchased Items
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Purchased Items (${order.items.length})',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                    const Divider(height: 16),
                    ...order.items.map((it) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    it.name,
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                  ),
                                  if (it.brand != null || it.packSize != null)
                                    Text(
                                      '${it.brand ?? ""} • ${it.packSize ?? it.unit}',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                  Text(
                                    '${CurrencyFormatter.format(it.sellingPrice)} x ${it.quantity}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              CurrencyFormatter.format(it.lineSubtotal),
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                      );
                    }),
                    const Divider(height: 16),
                    _buildSummaryRow('Subtotal', CurrencyFormatter.format(order.subtotal)),
                    _buildSummaryRow('Delivery Fee', order.deliveryFee == 0 ? 'FREE' : CurrencyFormatter.format(order.deliveryFee)),
                    const SizedBox(height: 4),
                    _buildSummaryRow('Payable Total', CurrencyFormatter.format(order.totalAmount), isBold: true),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Invoice Access & Metadata
              Container(
                padding: const EdgeInsets.all(AppDimensions.md),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('PDF Retail Invoice', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text(
                          order.invoiceNumber != null ? 'Invoice #${order.invoiceNumber}' : 'Available on demand',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
                      onPressed: () => showOrderInvoiceDialog(context, order),
                      icon: const Icon(Icons.picture_as_pdf, size: 16, color: Colors.white),
                      label: const Text('View Invoice', style: TextStyle(fontSize: 12, color: Colors.white)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Status History & Audit Trail
              if (order.statusHistory.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.all(AppDimensions.md),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Audit History & Lifecycle Log', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      const Divider(height: 16),
                      ...order.statusHistory.map((h) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.circle, size: 8, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${h.action}: ${h.toStatus ?? h.note ?? ""}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      '${_formatDateTime(h.timestamp)} • by ${h.performedBy ?? "System"}',
                                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ],
          ),
        ),
        if (_isActionInProgress)
          Container(
            color: Colors.black26,
            child: const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 14 : 12,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
              color: isBold ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isBold ? 16 : 12,
              fontWeight: isBold ? FontWeight.w900 : FontWeight.w600,
              color: isBold ? AppColors.primary : AppColors.textPrimary,
            ),
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
