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
      if (status != null && status.isNotEmpty && status != 'ALL') ...{
        'status': status,
        'orderStatus': status,
      },
      if (paymentStatus != null && paymentStatus.isNotEmpty && paymentStatus != 'ALL') 'paymentStatus': paymentStatus,
      if (paymentMethod != null && paymentMethod.isNotEmpty && paymentMethod != 'ALL') 'paymentMethod': paymentMethod,
      if (fulfillmentMethod != null && fulfillmentMethod.isNotEmpty && fulfillmentMethod != 'ALL') 'fulfillmentMethod': fulfillmentMethod,
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (sortBy != null && sortBy.isNotEmpty) 'sortBy': sortBy,
      if (sortOrder != null && sortOrder.isNotEmpty) 'sortOrder': sortOrder,
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
    };

    Response res;
    try {
      res = await _dio.get('/orders/admin', queryParameters: params);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        res = await _dio.get('/orders/admin/all', queryParameters: params);
      } else {
        rethrow;
      }
    }

    final raw = res.data;
    final Map<String, dynamic> data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? (raw['data'] as Map<String, dynamic>? ?? {})
        : (raw is Map<String, dynamic> ? raw : {});
    final ordersRaw = (data['orders'] as List<dynamic>?) ??
        (raw is Map<String, dynamic> && raw['orders'] is List ? raw['orders'] as List<dynamic> : []);
    final orders = ordersRaw
        .map((e) => CustomerOrderModel.fromJson(e as Map<String, dynamic>))
        .toList();

    final pagination = data['pagination'] as Map<String, dynamic>? ?? {};

    return {
      'orders': orders,
      'total': (data['total'] ?? pagination['total'] as num?)?.toInt() ?? orders.length,
      'page': (data['page'] ?? pagination['page'] as num?)?.toInt() ?? page,
      'totalPages': (data['totalPages'] ?? pagination['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Fetch single order details with full snapshot and audit trail
  Future<CustomerOrderModel> getOrderDetails(String id) async {
    Response res;
    try {
      res = await _dio.get('/orders/admin/$id');
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        res = await _dio.get('/orders/$id');
      } else {
        rethrow;
      }
    }
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Transition order status (validated server-side)
  Future<CustomerOrderModel> updateStatus(String id, String status, {String? notes}) async {
    final payload = {
      'status': status,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    Response res;
    try {
      res = await _dio.patch('/orders/admin/$id/status', data: payload);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        res = await _dio.post('/orders/admin/$id/status', data: payload);
      } else {
        rethrow;
      }
    }
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Verify Manual WhatsApp QR Payment with audit verification
  Future<CustomerOrderModel> verifyWhatsAppPayment(
    String id, {
    String? paymentReference,
    String? notes,
  }) async {
    final payload = <String, dynamic>{
      if (paymentReference != null && paymentReference.isNotEmpty) ...{
        'paymentReference': paymentReference,
        'transactionReference': paymentReference,
      },
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    Response res;
    try {
      res = await _dio.patch('/orders/admin/$id/verify-payment', data: payload);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        res = await _dio.post('/orders/admin/$id/verify-payment', data: payload);
      } else {
        rethrow;
      }
    }
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Mark Cash on Delivery collected
  Future<CustomerOrderModel> collectCodPayment(String id, {String? notes}) async {
    final payload = <String, dynamic>{
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    };
    Response res;
    try {
      res = await _dio.patch('/orders/admin/$id/collect-cod', data: payload);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        res = await _dio.post('/orders/admin/$id/collect-cod', data: payload);
      } else {
        rethrow;
      }
    }
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Consequential order cancellation with single-shot inventory restoration
  Future<CustomerOrderModel> cancelOrder(String id, String reason) async {
    final payload = {'reason': reason};
    Response res;
    try {
      res = await _dio.patch('/orders/admin/$id/cancel', data: payload);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        res = await _dio.post('/orders/admin/$id/cancel', data: payload);
      } else {
        rethrow;
      }
    }
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Admin: Create manual / POS in-store order
  Future<CustomerOrderModel> createAdminOrder(Map<String, dynamic> payload) async {
    final res = await _dio.post('/orders/admin', data: payload);
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Admin: Update order details (Customer info, notes, order status, payment status)
  Future<CustomerOrderModel> updateAdminOrder(String id, Map<String, dynamic> payload) async {
    final res = await _dio.patch('/orders/admin/$id', data: payload);
    final raw = res.data;
    final data = (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : raw as Map<String, dynamic>;
    return CustomerOrderModel.fromJson(data);
  }

  /// Admin: Permanently delete order from MongoDB and restore inventory
  Future<Map<String, dynamic>> deleteAdminOrder(String id) async {
    final res = await _dio.delete('/orders/admin/$id');
    final raw = res.data;
    return (raw is Map<String, dynamic> && raw.containsKey('data'))
        ? raw['data'] as Map<String, dynamic>
        : (raw is Map<String, dynamic> ? raw : {'deleted': true});
  }
}

final adminOrdersRepositoryProvider = Provider<AdminOrdersRepository>((ref) {
  return AdminOrdersRepository();
});
