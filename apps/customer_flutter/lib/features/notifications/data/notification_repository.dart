import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../domain/models/notification_item_model.dart';

class NotificationRepository {
  final Dio _dio;

  NotificationRepository({Dio? dio}) : _dio = dio ?? apiClient.dio;

  /// Fetches notifications for current authenticated user or by customer phone
  Future<List<NotificationItemModel>> getNotifications({String? phone, bool? admin}) async {
    final params = <String, dynamic>{
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (admin == true) 'admin': 'true',
    };

    final response = await _dio.get('/notifications', queryParameters: params);
    final data = response.data;
    final List items = (data['data'] is List) ? (data['data'] as List) : [];

    return items
        .map((item) => NotificationItemModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  /// Marks a specific notification as read
  Future<void> markAsRead(String id) async {
    await _dio.patch('/notifications/$id/read');
  }

  /// Marks all notifications as read
  Future<void> markAllAsRead({String? phone, List<String>? ids}) async {
    final payload = <String, dynamic>{
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (ids != null && ids.isNotEmpty) 'ids': ids,
    };
    await _dio.patch('/notifications/read-all', data: payload);
  }
}

final notificationRepository = NotificationRepository();
