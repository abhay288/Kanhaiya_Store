import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/api_client.dart';
import '../domain/models/analytics_models.dart';

class AdminAnalyticsRepository {
  final Dio _dio;

  AdminAnalyticsRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetch dashboard overview KPIs
  Future<AnalyticsOverviewModel> getOverview(String range, {String? startDate, String? endDate}) async {
    final params = <String, dynamic>{
      'range': range,
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
    };
    final res = await _dio.get('/admin/analytics/overview', queryParameters: params);
    return AnalyticsOverviewModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Fetch sales and revenue analytics
  Future<SalesAnalyticsModel> getSalesAnalytics(String range, {String? startDate, String? endDate}) async {
    final params = <String, dynamic>{
      'range': range,
      if (startDate != null && startDate.isNotEmpty) 'startDate': startDate,
      if (endDate != null && endDate.isNotEmpty) 'endDate': endDate,
    };
    final res = await _dio.get('/admin/analytics/sales', queryParameters: params);
    return SalesAnalyticsModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Fetch product performance reports
  Future<Map<String, dynamic>> getProductReports(String range, {int page = 1, int limit = 20}) async {
    final params = <String, dynamic>{
      'range': range,
      'page': page,
      'limit': limit,
    };
    final res = await _dio.get('/admin/reports/products', queryParameters: params);
    return res.data['data'] as Map<String, dynamic>;
  }

  /// Fetch inventory status & replenishment reports
  Future<Map<String, dynamic>> getInventoryReports(String range) async {
    final params = <String, dynamic>{'range': range};
    final res = await _dio.get('/admin/reports/inventory', queryParameters: params);
    return res.data['data'] as Map<String, dynamic>;
  }

  /// Fetch order & payment breakdowns
  Future<Map<String, dynamic>> getOrderReports(String range) async {
    final params = <String, dynamic>{'range': range};
    final res = await _dio.get('/admin/reports/orders', queryParameters: params);
    return res.data['data'] as Map<String, dynamic>;
  }

  /// Fetch customer management list
  Future<Map<String, dynamic>> getCustomers({String? search, int page = 1, int limit = 20}) async {
    final params = <String, dynamic>{
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      'page': page,
      'limit': limit,
    };
    final res = await _dio.get('/admin/customers', queryParameters: params);
    final data = res.data['data'] as Map<String, dynamic>;
    final rawList = data['customers'] as List<dynamic>? ?? [];
    final customers = rawList
        .map((e) => CustomerSummaryModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return {
      'customers': customers,
      'total': (data['total'] as num?)?.toInt() ?? 0,
      'page': (data['page'] as num?)?.toInt() ?? 1,
      'totalPages': (data['totalPages'] as num?)?.toInt() ?? 1,
    };
  }

  /// Fetch customer profile and order history
  Future<Map<String, dynamic>> getCustomerDetails(String id) async {
    final res = await _dio.get('/admin/customers/$id');
    return res.data['data'] as Map<String, dynamic>;
  }

  /// Fetch full store settings
  Future<AdminStoreSettingsModel> getStoreSettings() async {
    final res = await _dio.get('/admin/settings');
    return AdminStoreSettingsModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Update store settings
  Future<AdminStoreSettingsModel> updateStoreSettings(Map<String, dynamic> updates) async {
    final res = await _dio.patch('/admin/settings', data: updates);
    return AdminStoreSettingsModel.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  /// Trigger CSV export download
  Future<String> exportReportCsv(String reportType, {String? range}) async {
    final params = <String, dynamic>{
      if (range != null && range.isNotEmpty) 'range': range,
    };
    final res = await _dio.get(
      '/admin/reports/export/$reportType',
      queryParameters: params,
      options: Options(responseType: ResponseType.plain),
    );
    return res.data as String;
  }
}

final adminAnalyticsRepositoryProvider = Provider<AdminAnalyticsRepository>((ref) {
  return AdminAnalyticsRepository();
});
