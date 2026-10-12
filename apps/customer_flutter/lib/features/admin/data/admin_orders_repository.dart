import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../../checkout/domain/models/order_model.dart';

class AdminOrdersRepository {
  final Dio _dio;

  AdminOrdersRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetch Admin Order Metrics Dashboard KPIs
  Future<Map<String, int>> getMetrics() async {
    final res = await _dio.get('/orders/admin/metrics');
    final raw = res.data['data'] as Map<String, dynamic>? ?? {};
    return raw.map((k, v) => MapEntry(k, (v as num?)?.toInt() ?? 0));
  }

  /// Fetch Paginated, Filtered and Searched Admin Orders
  Future<Map<String, dynamic>> getOrders({
    int page = 1,
    int limit = 15,
    String? status,
    String? paymentStatus,
    String? paymentMethod,
    String? fulfillmentMethod,
    String? search,
    String? sortBy,
    String? sortOrder,
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (status != null && status.isNotEmpty && status != 'ALL') 'status': status,
      if (paymentStatus != null && paymentStatus.isNotEmpty && paymentStatus != 'ALL') 'paymentStatus': paymentStatus,
      if (paymentMethod != null && paymentMethod.isNotEmpty && paymentMethod != 'ALL') 'paymentMethod': paymentMethod,
      if (fulfillmentMethod != null && fulfillmentMethod.isNotEmpty && fulfillmentMethod != 'ALL') 'fulfillmentMethod': fulfillmentMethod,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (sortBy != null && sortBy.isNotEmpty) 'sortBy': sortBy,
      if (sortOrder != null && sortOrder.isNotEmpty) 'sortOrder': sortOrder,
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
    };

    final res = await _dio.get('/orders/admin/all', queryParameters: params);
    final data = res.data['data'] as Map<String, dynamic>? ?? {};
    final ordersRaw = data['orders'] as List<dynamic>? ?? [];
    final orders = ordersRaw
        .map((e) => CustomerOrderModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return {
      'orders': orders,
      'total': (data['total'] as num?)?.toInt() ?? 0,
      'page': (data['page'] as num?)?.toInt() ?? 1,
      'totalPages': (data['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Fetch single order details with full snapshot and audit trail
  Future<CustomerOrderModel> getOrderDetails(String id) async {
    final res = await _dio.get('/orders/admin/$id');
    return CustomerOrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Transition order status (validated server-side)
  Future<CustomerOrderModel> updateStatus(String id, String status, {String? notes}) async {
    final res = await _dio.patch('/orders/admin/$id/status', data: {
      'status': status,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return CustomerOrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Verify Manual WhatsApp QR Payment with audit verification
  Future<CustomerOrderModel> verifyWhatsAppPayment(
    String id, {
    String? paymentReference,
    String? notes,
  }) async {
    final res = await _dio.post('/orders/admin/$id/verify-payment', data: {
      if (paymentReference != null && paymentReference.isNotEmpty)
        'paymentReference': paymentReference,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return CustomerOrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Mark Cash on Delivery collected
  Future<CustomerOrderModel> collectCodPayment(String id, {String? notes}) async {
    final res = await _dio.post('/orders/admin/$id/collect-cod', data: {
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return CustomerOrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Consequential order cancellation with single-shot inventory restoration
  Future<CustomerOrderModel> cancelOrder(String id, String reason) async {
    final res = await _dio.post('/orders/admin/$id/cancel', data: {
      'reason': reason,
    });
    return CustomerOrderModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}

final adminOrdersRepositoryProvider = Provider<AdminOrdersRepository>((ref) {
  return AdminOrdersRepository();
});
