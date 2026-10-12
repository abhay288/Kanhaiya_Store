import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../catalog/domain/models/product_model.dart';
import '../domain/models/inventory_alert_model.dart';
import '../domain/models/inventory_summary_model.dart';
import '../domain/models/stock_movement_model.dart';

class AdminInventoryRepository {
  final Dio _dio;

  AdminInventoryRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetch dashboard KPIs and summary
  Future<InventorySummaryModel> getSummary() async {
    final response = await _dio.get('/inventory/summary');
    return InventorySummaryModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Perform stock adjustment (Opening, Receipt, Damage, Increase, Decrease)
  Future<Map<String, dynamic>> adjustStock(Map<String, dynamic> data) async {
    final response = await _dio.post('/inventory/adjust', data: data);
    return response.data['data'] as Map<String, dynamic>;
  }

  /// Perform stock physical count reconciliation
  Future<Map<String, dynamic>> reconcileStock(Map<String, dynamic> data) async {
    final response = await _dio.post('/inventory/reconcile', data: data);
    return response.data['data'] as Map<String, dynamic>;
  }

  /// Fetch paginated stock movement audit trail
  Future<Map<String, dynamic>> getMovements({
    int page = 1,
    int limit = 20,
    String? productId,
    String? adjustmentType,
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (productId != null && productId.isNotEmpty) 'productId': productId,
      if (adjustmentType != null && adjustmentType.isNotEmpty) 'adjustmentType': adjustmentType,
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
    };

    final response = await _dio.get('/inventory/movements', queryParameters: params);
    final data = response.data['data'] as Map<String, dynamic>;
    final movementsRaw = data['movements'] as List<dynamic>? ?? [];
    final movements = movementsRaw
        .map((m) => StockMovementModel.fromJson(m as Map<String, dynamic>))
        .toList();

    return {
      'movements': movements,
      'total': (data['total'] as num?)?.toInt() ?? 0,
      'page': (data['page'] as num?)?.toInt() ?? 1,
      'totalPages': (data['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Fetch alerts
  Future<Map<String, dynamic>> getAlerts({
    int page = 1,
    int limit = 20,
    String? status,
    String? alertType,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (status != null && status.isNotEmpty) 'status': status,
      if (alertType != null && alertType.isNotEmpty) 'alertType': alertType,
    };

    final response = await _dio.get('/inventory/alerts', queryParameters: params);
    final data = response.data['data'] as Map<String, dynamic>;
    final alertsRaw = data['alerts'] as List<dynamic>? ?? [];
    final alerts = alertsRaw
        .map((a) => InventoryAlertModel.fromJson(a as Map<String, dynamic>))
        .toList();

    return {
      'alerts': alerts,
      'total': (data['total'] as num?)?.toInt() ?? 0,
      'page': (data['page'] as num?)?.toInt() ?? 1,
      'totalPages': (data['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Acknowledge an active inventory alert
  Future<InventoryAlertModel> acknowledgeAlert(String alertId) async {
    final response = await _dio.patch('/inventory/alerts/$alertId/acknowledge');
    return InventoryAlertModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Resolve an inventory alert
  Future<InventoryAlertModel> resolveAlert(String alertId) async {
    final response = await _dio.patch('/inventory/alerts/$alertId/resolve');
    return InventoryAlertModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  /// Get Low & Out of stock report
  Future<List<ProductModel>> getLowStockReport() async {
    final response = await _dio.get('/inventory/low-stock');
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list.map((p) => ProductModel.fromJson(p as Map<String, dynamic>)).toList();
  }

  /// Get expiry report
  Future<List<ProductModel>> getExpiryReport({int daysThreshold = 30}) async {
    final response = await _dio.get(
      '/inventory/expiry-report',
      queryParameters: {'daysThreshold': daysThreshold},
    );
    final list = response.data['data'] as List<dynamic>? ?? [];
    return list.map((p) => ProductModel.fromJson(p as Map<String, dynamic>)).toList();
  }
}

final adminInventoryRepository = AdminInventoryRepository();
